import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { DateTime } from 'luxon';

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

export function normalizeConfig(parsedConfig) {
  const {
    referenceApp,
    assigneeField,
    assignmentThresholdField,
    priorityList,
    threshold,
  } = parsedConfig;

  return {
    referenceAppId: referenceApp.appId,
    assigneeFieldCode: assigneeField.code,
    assignmentThresholdFieldCode: assignmentThresholdField.code,
    priorityList: priorityList.map((priority) => {
      console.log({ priority });
      return {
        componentFieldCode: priority.component.code,
        priority: priority.priority,
        criteria: priority.criteria.criteria,
      };
    }),
    threshold,
  };
}

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
  function filterUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
  console.log({ query: `${assignmentThresholdFieldCode} < ${threshold}` });

  const getRecordsResp = await client.record.getAllRecords({
    app: referenceAppId,
    fields: [
      assigneeFieldCode,
      assignmentThresholdFieldCode,
      ...priorityComponents,
    ].filter(filterUnique),
    condition: `${assignmentThresholdFieldCode} < ${threshold}`,
  });

  console.log({ getRecordsResp });
  return getRecordsResp;
}

export async function getProcessManagement() {
  const client = new KintoneRestAPIClient();
  const processManagementResp = await client.app.getProcessManagement({
    app: kintone.app.getId(),
  });

  return processManagementResp;
}

export async function updateRecordStatus(recordId, actionName, assigneeCode) {
  const client = new KintoneRestAPIClient();
  const updateRecordStatusResp = await client.record.updateRecordStatus({
    app: kintone.app.getId(),
    id: recordId,
    action: actionName,
    assignee: assigneeCode,
  });

  return updateRecordStatusResp;
}

export async function incrementComponentReference(
  assigneeCode,
  normalizedConfig,
) {
  const client = new KintoneRestAPIClient();
  const { referenceAppId, assigneeFieldCode, assignmentThresholdFieldCode } =
    normalizedConfig;
  console.log({ normalizedConfig });

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
 * todo 1. Update the Assignment Date field with the current date
 * todo 2. Update the Dedicated Assignee field with the Config
 *
 */
export async function updateAssignmentDateAndDedicatedAssignee(
  recordId,
  assigneeCode,
  normalizedConfig,
) {
  const client = new KintoneRestAPIClient();
  const currentDate = DateTime.local().toISODate();
  const updateRecordResp = await client.record.updateRecord({
    app: kintone.app.getId(),
    id: recordId,
    record: {
      Assignment_Date: {
        value: currentDate,
      },
      Dedicated_Assignee: {
        value: [
          {
            code: assigneeCode,
          },
        ],
      },
    },
  });

  return updateRecordResp;
}
