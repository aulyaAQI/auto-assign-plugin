import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { DateTime } from 'luxon';
import Swal from 'sweetalert2';

/**
 * Parses the provided configuration object and returns a new object with parsed values.
 * If a value cannot be parsed, it is assigned as is.
 *
 * @param {Object} config - The configuration object to be parsed.
 * @returns {Object} - The new object with parsed values.
 */
export function getParsedConfig(config) {
  return Object.keys(config).reduce((acc, key) => {
    try {
      acc[key] = JSON.parse(config[key]);
    } catch (e) {
      acc[key] = config[key];
    }
    return acc;
  }, {});
}

/**
 * Normalizes the parsed configuration object.
 *
 * @param {Object} parsedConfig - The parsed configuration object.
 * @returns {Object} - The normalized configuration object.
 */
export function normalizeConfig(parsedConfig) {
  const {
    referenceApp,
    assigneeField,
    assignmentThresholdField,
    priorityList,
    threshold,
    sourceAssignmentDateField,
    sourceDedicatedAssigneeField,
  } = parsedConfig;

  return {
    referenceAppId: referenceApp.appId,
    assigneeFieldCode: assigneeField.code,
    assignmentThresholdFieldCode: assignmentThresholdField.code,
    sourceAssignmentDateFieldCode: sourceAssignmentDateField.code,
    sourceDedicatedAssigneeFieldCode: sourceDedicatedAssigneeField.code,
    priorityList: priorityList.map((priority) => {
      return {
        componentFieldCode: priority.component.code,
        priority: priority.priority,
        criteria: priority.criteria.criteria,
      };
    }),
    threshold,
  };
}

/**
 * Retrieves records from Kintone based on the provided configuration.
 *
 * @param {Object} normalizedConfig - The normalized configuration object.
 * @param {string} normalizedConfig.referenceAppId - The reference app ID.
 * @param {string} normalizedConfig.assigneeFieldCode - The assignee field code.
 * @param {string} normalizedConfig.assignmentThresholdFieldCode - The assignment threshold field code.
 * @param {Array} normalizedConfig.priorityList - The priority list.
 * @param {number} normalizedConfig.threshold - The threshold value.
 * @returns {Promise<Object>} - A promise that resolves to the response containing the retrieved records.
 */
export async function getRecords(normalizedConfig) {
  const {
    referenceAppId,
    assigneeFieldCode,
    assignmentThresholdFieldCode,
    priorityList,
    threshold,
  } = normalizedConfig;

  const priorityComponents = priorityList.map(
    (priority) => priority.componentFieldCode,
  );

  const client = new KintoneRestAPIClient();

  const getRecordsResp = await client.record.getAllRecords({
    app: referenceAppId,
    fields: [
      assigneeFieldCode,
      assignmentThresholdFieldCode,
      ...priorityComponents,
    ].filter(filterUnique),
    condition: `${assignmentThresholdFieldCode} < ${threshold}`,
  });

  return getRecordsResp;
}

/**
 * Filters out duplicate values in an array.
 *
 * @param {*} value - The current value being processed.
 * @param {number} index - The index of the current value being processed.
 * @param {Array} self - The array being processed.
 * @returns {boolean} - True if the value is unique, false otherwise.
 */
function filterUnique(value, index, self) {
  return self.indexOf(value) === index;
}

/**
 * Retrieves the process management information for the current Kintone app.
 * @returns {Promise<Object>} A promise that resolves to the process management response object.
 */
export async function getProcessManagement() {
  const client = new KintoneRestAPIClient();
  const processManagementResp = await client.app.getProcessManagement({
    app: kintone.mobile.app.getId(),
  });

  return processManagementResp;
}

/**
 * Updates the status of a record in Kintone.
 *
 * @param {number} recordId - The ID of the record to update.
 * @param {string} actionName - The name of the action to perform on the record.
 * @param {string} assigneeCode - The code of the assignee for the action.
 * @returns {Promise<Object>} - A promise that resolves to the response of the update operation.
 */
export async function updateRecordStatus(recordId, actionName, assigneeCode) {
  const client = new KintoneRestAPIClient();
  const updateRecordStatusResp = await client.record.updateRecordStatus({
    app: kintone.mobile.app.getId(),
    id: recordId,
    action: actionName,
    assignee: assigneeCode,
  });

  return updateRecordStatusResp;
}

/**
 * Increments the component reference value for a given assignee.
 * @param {string} assigneeCode - The code of the assignee.
 * @param {Object} normalizedConfig - The normalized configuration object.
 * @param {string} normalizedConfig.referenceAppId - The ID of the reference app.
 * @param {string} normalizedConfig.assigneeFieldCode - The code of the assignee field.
 * @param {string} normalizedConfig.assignmentThresholdFieldCode - The code of the assignment threshold field.
 * @returns {Promise<Object>} - A promise that resolves to the updated record response.
 */
export async function incrementComponentReference(
  assigneeCode,
  normalizedConfig,
) {
  const client = new KintoneRestAPIClient();
  const { referenceAppId, assigneeFieldCode, assignmentThresholdFieldCode } =
    normalizedConfig;

  const getRecordResp = await client.record.getRecords({
    app: referenceAppId,
    query: `${assigneeFieldCode} in ("${assigneeCode}")`,
  });

  const record = getRecordResp.records[0];
  const currentComponentValue = record[assignmentThresholdFieldCode].value;

  const updatedComponentValue = parseFloat(currentComponentValue) + 1;

  const updateRecordResp = await client.record.updateRecord({
    app: referenceAppId,
    id: record.$id.value,
    record: {
      [assignmentThresholdFieldCode]: {
        value: updatedComponentValue,
      },
    },
  });

  return updateRecordResp;
}

/**
 * Decrements the value of a component reference in a Kintone record.
 * @param {string} assigneeCode - The assignee code.
 * @param {Object} normalizedConfig - The normalized configuration object.
 * @param {string} normalizedConfig.referenceAppId - The reference app ID.
 * @param {string} normalizedConfig.assigneeFieldCode - The assignee field code.
 * @param {string} normalizedConfig.assignmentThresholdFieldCode - The assignment threshold field code.
 * @returns {Promise<Object>} - A promise that resolves to the updated record response.
 */
export async function decrementComponentReference(
  assigneeCode,
  normalizedConfig,
) {
  const client = new KintoneRestAPIClient();
  const { referenceAppId, assigneeFieldCode, assignmentThresholdFieldCode } =
    normalizedConfig;

  const getRecordResp = await client.record.getRecords({
    app: referenceAppId,
    query: `${assigneeFieldCode} in ("${assigneeCode}")`,
  });

  const record = getRecordResp.records[0];
  const currentComponentValue = record[assignmentThresholdFieldCode].value;

  const updatedComponentValue = parseFloat(currentComponentValue) - 1;

  const updateRecordResp = await client.record.updateRecord({
    app: referenceAppId,
    id: record.$id.value,
    record: {
      [assignmentThresholdFieldCode]: {
        value: updatedComponentValue,
      },
    },
  });

  return updateRecordResp;
}

/**
 * Updates the assignment date and dedicated assignee of a record.
 * @param {Object} record - The record object.
 * @param {string} assigneeCode - The assignee code.
 * @param {Object} normalizedConfig - The normalized configuration object.
 * @returns {Promise<void>} - A promise that resolves when the update is complete.
 */

export async function updateAssignmentDateAndDedicatedAssignee(
  record,
  assigneeCode,
  normalizedConfig,
) {
  const client = new KintoneRestAPIClient();
  const recordId = record.$id.value;

  const { sourceAssignmentDateFieldCode, sourceDedicatedAssigneeFieldCode } =
    normalizedConfig;

  const currentDate = DateTime.local().toISODate();
  const updateOpt = {
    app: kintone.mobile.app.getId(),
    id: recordId,
    record: {
      [sourceAssignmentDateFieldCode]: {
        value: currentDate,
      },
      [sourceDedicatedAssigneeFieldCode]: {
        value: [
          {
            code: assigneeCode,
          },
        ],
      },
    },
  };

  try {
    await client.record.updateRecord(updateOpt);

    const getResp = await client.record.getRecord({
      app: kintone.app.getId(),
      id: recordId,
    });
    const currentRecord = getResp.record;

    try {
      if (record?.In_Progress_Deadline_Final) {
        const ipFinal = currentRecord.In_Progress_Deadline_Final.value;
        const asFinal = currentRecord.Awaiting_Shipment_Deadline_Final.value;
        const rFinal = currentRecord.Resolved_Deadline_Final.value;

        try {
          await client.record.updateRecord({
            app: kintone.mobile.app.getId(),
            id: recordId,
            record: {
              IPD: {
                value: ipFinal,
              },
              ASD: {
                value: asFinal,
              },
              RD: {
                value: rFinal,
              },
            },
          });
        } catch (error) {
          console.log({ error });
          throw error;
        }
      }
    } catch (error) {
      console.log({ error });
      throw error;
    }
  } catch (error) {
    console.log({ error });
    throw error;
  }
}

/**
 * Suggests an assignee based on the provided configuration, record, and related action.
 * @param {Object} normalizedConfig - The normalized configuration object.
 * @param {Object} record - The record object.
 * @param {Object} relatedAction - The related action object.
 * @returns {Promise<void>} - A promise that resolves once the assignee suggestion process is completed.
 */
export async function suggestAssignee(normalizedConfig, record, relatedAction) {
  const thisButton = document.getElementById('suggest-assignee');
  thisButton.disabled = true;

  try {
    Swal.fire({
      title: 'Finding best candidate...',
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const records = await getRecords(normalizedConfig);
    const assigneeCandidates = records.map((assigneeRecord) => {
      const assigneeCode =
        assigneeRecord[normalizedConfig.assigneeFieldCode].value[0].code;
      const assigneeName =
        assigneeRecord[normalizedConfig.assigneeFieldCode].value[0].name;
      const candidateDetails = {
        assigneeCode,
        assigneeName,
      };

      normalizedConfig.priorityList.forEach((priority) => {
        const component = assigneeRecord[priority.componentFieldCode].value;

        candidateDetails[priority.componentFieldCode] =
          parseFloat(component) || 0;
      });

      return candidateDetails;
    });
    const initialAssigneeCandidates = assigneeCandidates;
    const sortedPriorityList = normalizedConfig.priorityList.sort((a, b) => {
      return a.priority - b.priority;
    });
    let evaluatedAssigneeCandidates = assigneeCandidates;
    sortedPriorityList.some((priority) => {
      const componentFieldCode = priority.componentFieldCode;
      const criteria = priority.criteria;

      const minOrMax = criteria === 'htl' ? 'max' : 'min';

      const minMaxValue = Math[minOrMax](
        ...evaluatedAssigneeCandidates.map((candidate) => {
          return candidate[componentFieldCode];
        }),
      );

      evaluatedAssigneeCandidates = evaluatedAssigneeCandidates.filter(
        (candidate) => {
          return candidate[componentFieldCode] === minMaxValue;
        },
      );

      return evaluatedAssigneeCandidates.length === 1;
    });
    const bestCandidates = evaluatedAssigneeCandidates;
    const priorityCandidate = bestCandidates[0];

    if (!bestCandidates.length) {
      Swal.close();
      Swal.fire({
        title: 'No candidate found!',
        text: 'The threshold for the assignees has been reached. You may need to manually assign the record or reconfigure the threshold',
        icon: 'warning',
      });

      thisButton.disabled = false;

      return;
    }

    const isSingleCandidate = bestCandidates.length === 1;

    const mainWrapper = generateSwalHtml(
      bestCandidates,
      priorityCandidate,
      isSingleCandidate,
    );

    let bestCandidatesElement;
    const confirmAssign = await Swal.fire({
      title: `Best ${isSingleCandidate ? 'candidate' : 'candidates'} found!${isSingleCandidate ? '' : ' (with tie score)'}`,
      html: mainWrapper,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Assign',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        bestCandidatesElement = document.getElementById('best-candidates');
      },
    });

    if (confirmAssign.isConfirmed) {
      const isChangedReference = await recheckCurrentAssigneeCandidates(
        normalizedConfig,
        initialAssigneeCandidates,
      );

      if (isChangedReference) {
        thisButton.disabled = false;
        return;
      }
      Swal.fire({
        title: 'Assigning...',
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const assigneeCode = bestCandidatesElement?.value;
      const assigneeName =
        bestCandidatesElement?.options[bestCandidatesElement?.selectedIndex]
          .innerHTML;

      await updateRecordStatus(
        record.$id.value,
        relatedAction.name,
        assigneeCode,
      );

      Swal.update({
        title: 'Assigned!',
        icon: 'success',
        showConfirmButton: false,
        allowEscapeKey: false,
        allowOutsideClick: false,
      });

      Swal.update({
        title: 'Incrementing component reference...',
      });

      await incrementComponentReference(assigneeCode, normalizedConfig);

      await updateAssignmentDateAndDedicatedAssignee(
        record,
        assigneeCode,
        normalizedConfig,
      );

      Swal.close();

      Swal.fire({
        title: `${normalizedConfig.assignmentThresholdFieldCode} for ${assigneeName} has been successfully incremented!`,
        icon: 'success',
        timer: 3000,
        timerProgressBar: true,
        allowEscapeKey: false,
        allowOutsideClick: false,
      }).then(() => {
        location.reload();
      });
    }

    thisButton.disabled = false;
  } catch (error) {
    console.error(error);
    Swal.fire({
      title: 'An error occurred!',
      text: 'An error occurred while processing the request. If the problem persists, please try to reload the page.',
      icon: 'error',
    });

    thisButton.disabled = false;
  }
}

/**
 * Generates the HTML structure for a Swal (SweetAlert) modal based on the provided data.
 *
 * @param {Array} bestCandidates - An array of best candidates.
 * @param {Object} priorityCandidate - The priority candidate object.
 * @param {boolean} isSingleCandidate - Indicates if there is only a single candidate.
 * @returns {HTMLElement} - The generated HTML structure.
 */
function generateSwalHtml(
  bestCandidates,
  priorityCandidate,
  isSingleCandidate,
) {
  const mainWrapper = document.createElement('div');
  const listWrapper = document.createElement('div');

  Object.keys(priorityCandidate)
    .filter((key) => {
      return key !== 'assigneeName' && key !== 'assigneeCode';
    })
    .forEach((key) => {
      const listItem = document.createElement('div');
      listItem.className = 'swal2-label-input';
      const labelElement = document.createElement('label');
      labelElement.attributes.for = key;
      labelElement.className = 'swal2-label';
      labelElement.innerText = key;
      const inputElement = document.createElement('input');
      inputElement.id = key;
      inputElement.className = 'swal2-input';
      inputElement.value = priorityCandidate[key];
      inputElement.disabled = true;

      listItem.append(labelElement, inputElement);
      listWrapper.append(listItem);
    });

  const otherOptions = document.createElement('div');
  otherOptions.className = 'swal2-label-input';
  const dropDowns = document.createElement('select');
  dropDowns.id = 'best-candidates';

  if (isSingleCandidate) {
    dropDowns.disabled = true;
  }
  const ddClassList = dropDowns.classList;
  ddClassList.add('swal2-select');
  ddClassList.add('swal2-input');

  for (let i = 0; i < bestCandidates.length; i++) {
    const option = document.createElement('option');
    option.value = bestCandidates[i].assigneeCode;
    option.text = bestCandidates[i].assigneeName;
    dropDowns.appendChild(option);
  }

  otherOptions.append(dropDowns);

  mainWrapper.append(otherOptions);
  mainWrapper.append(listWrapper);

  return mainWrapper;
}

/**
 * Rechecks the current assignee candidates based on the provided configuration and initial assignee candidates.
 * @param {Object} normalizedConfig - The normalized configuration object.
 * @param {Array} initialAssigneeCandidates - The initial assignee candidates array.
 * @returns {boolean} - Returns true if the assignee candidates have changed, false otherwise.
 */
async function recheckCurrentAssigneeCandidates(
  normalizedConfig,
  initialAssigneeCandidates,
) {
  const currentRecords = await getRecords(normalizedConfig);

  const currentCandidates = currentRecords.map((assigneeRecord) => {
    const assigneeCode =
      assigneeRecord[normalizedConfig.assigneeFieldCode].value[0].code;
    const assigneeName =
      assigneeRecord[normalizedConfig.assigneeFieldCode].value[0].name;
    const candidateDetails = {
      assigneeCode,
      assigneeName,
    };

    normalizedConfig.priorityList.forEach((priority) => {
      const component = assigneeRecord[priority.componentFieldCode].value;

      candidateDetails[priority.componentFieldCode] =
        parseFloat(component) || 0;
    });

    return candidateDetails;
  });

  const sumInitialComponent = initialAssigneeCandidates.reduce(
    (acc, candidate) => {
      return acc + candidate[normalizedConfig.assignmentThresholdFieldCode];
    },
    0,
  );

  const sumCurrentComponent = currentCandidates.reduce((acc, candidate) => {
    return acc + candidate[normalizedConfig.assignmentThresholdFieldCode];
  }, 0);

  const isReferenceChanged = sumInitialComponent !== sumCurrentComponent;

  if (isReferenceChanged) {
    await Swal.fire({
      title: 'Assignee candidates have changed!',
      text: 'The assignee candidates have changed since you last checked. Please retry the process.',
      icon: 'warning',
    });
  }

  return isReferenceChanged;
}
