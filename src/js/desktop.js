import {} from './helper/kintone.js';
import {Button} from 'kintone-ui-component';
import {
  getParsedConfig,
  normalizeConfig,
  getRecords,
  getProcessManagement,
  updateRecordStatus,
  incrementComponentReference,
  updateAssignmentDateAndDedicatedAssignee,
  decrementComponentReference,
} from './helper/kintone.js';
import Swal from 'sweetalert2';

(function (PLUGIN_ID) {
  'use strict';

  console.log({PLUGIN_ID});

  let processManagement = null;
  kintone.events.on('app.record.detail.show', async (e) => {
    console.log({e});
    const {record} = e;
    const currentStatus = record.Status.value;

    processManagement = await getProcessManagement();
    console.log({processManagement});

    const states = processManagement.states;

    let initialStatus;

    for (const state in states) {
      if (states[state].index === '0') {
        initialStatus = state;
        break;
      }
    }

    const relatedAction = processManagement.actions.find((action) => {
      console.log(action.from, initialStatus, 'compare');
      return action.from === initialStatus;
    });

    /**
     * to do
     *
     * current Status can be configured (with APP Token -> proxy.config)
     * -> get initial status from getProcessManagement() API
     */
    if (currentStatus !== initialStatus) {
      return e;
    }

    const config = kintone.plugin.app.getConfig(PLUGIN_ID);
    console.log({config});
    const parsedConfig = getParsedConfig(config);
    console.log({parsedConfig});
    const normalizedConfig = normalizeConfig(parsedConfig);
    console.log({normalizedConfig});

    const headerElement = kintone.app.record.getHeaderMenuSpaceElement();

    const suggestAssignee = new Button({
      text: 'Suggest Assignee',
      type: 'submit',
      id: 'suggest-assignee',
    });

    headerElement.appendChild(suggestAssignee);

    suggestAssignee.addEventListener('click', async (event) => {
      console.log(event);
      //disable this button
      const thisButton = document.getElementById('suggest-assignee');
      thisButton.disabled = true;

      Swal.fire({
        title: 'Finding best candidate...',
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const records = await getRecords(normalizedConfig);

      const assigneeCandidates = records.map((record) => {
        const assigneeCode = record[normalizedConfig.assigneeFieldCode].value[0].code;
        const assigneeName = record[normalizedConfig.assigneeFieldCode].value[0].name;
        const candidateDetails = {
          assigneeCode,
          assigneeName,
        };

        normalizedConfig.priorityList.forEach((priority) => {
          const component = record[priority.componentFieldCode].value;

          candidateDetails[priority.componentFieldCode] = parseFloat(component) || 0;
        });

        return candidateDetails;
      });

      console.log({assigneeCandidates}, 'before sort');
      assigneeCandidates.forEach((candidate) => {
        console.table(candidate);
      });

      const sortedPriorityList = normalizedConfig.priorityList.sort((a, b) => {
        return a.priority - b.priority;
      });

      let bestCandidate;
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

        console.log({componentFieldCode, minMaxValue, priority: priority.priority, criteria});

        evaluatedAssigneeCandidates = evaluatedAssigneeCandidates.filter((candidate) => {
          console.log(candidate[componentFieldCode], minMaxValue, 'evaluating');
          return candidate[componentFieldCode] === minMaxValue;
        });
        console.log({evaluatedAssigneeCandidates}, 'evaluated');

        return evaluatedAssigneeCandidates.length === 1;
      });

      bestCandidate = evaluatedAssigneeCandidates[0];
      console.log(bestCandidate, 'best candidate');

      const assigneeCode = bestCandidate.assigneeCode;
      const assigneeName = bestCandidate.assigneeName;

      const mainWrapper = document.createElement('div');

      const ulWrapper = document.createElement('ul');
      ulWrapper.style.textAlign = 'left';
      ulWrapper.style.listStyleType = 'none';
      const mapBestCandidateObjToHtml = Object.keys(bestCandidate)
        .filter((key) => {
          return key !== 'assigneeName' && key !== 'assigneeCode';
        })
        .map((key) => {
          return `<li>${key}: ${bestCandidate[key]}</li>`;
        });
      ulWrapper.innerHTML = mapBestCandidateObjToHtml.join('');

      const confirmationTextElement = document.createElement('div');
      confirmationTextElement.innerHTML = `<br>Assign To <b>${assigneeName}</b>?</br>`;
      mainWrapper.appendChild(ulWrapper);
      mainWrapper.appendChild(confirmationTextElement);

      Swal.close();
      // swal with confirm button
      const confirmAssign = await Swal.fire({
        title: 'Best candidate found!',
        html: mainWrapper,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Assign',
        cancelButtonText: 'Cancel',
      });

      if (confirmAssign.isConfirmed) {
        console.log('assign');
        // loading swal
        Swal.fire({
          title: 'Assigning...',
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const updateRecordStatusResponse = await updateRecordStatus(record.$id.value, relatedAction.name, assigneeCode);
        console.log({updateRecordStatusResponse});

        // update to success swal
        Swal.update({
          title: 'Assigned!',
          icon: 'success',
          showConfirmButton: false,
          allowEscapeKey: false,
          allowOutsideClick: false,
        });

        // increment component reference
        Swal.update({
          title: 'Incrementing component reference...',
        });

        const incrementResponse = await incrementComponentReference(assigneeCode, normalizedConfig);
        console.log({incrementResponse});

        const updateAssignmentDateAndAssigneeResponse = await updateAssignmentDateAndDedicatedAssignee(
          record.$id.value,
          assigneeCode,
          normalizedConfig,
        );
        console.log({updateAssignmentDateAndAssigneeResponse});

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

      // reenable button
      thisButton.disabled = false;
    });

    return e;
  });

  kintone.events.on('app.record.detail.process.proceed', async (e) => {
    const {record} = e;
    const states = processManagement.states;
    const nextStatus = e.nextStatus.value;

    const currentStatus = e.record.Status.value;

    const lastState = Object.keys(states).find((state) => {
      return states[state].index === (Object.keys(states).length - 1).toString();
    });

    if (nextStatus !== lastState) {
      return e;
    }

    const config = kintone.plugin.app.getConfig(PLUGIN_ID);
    const parsedConfig = getParsedConfig(config);
    const normalizedConfig = normalizeConfig(parsedConfig);

    const currentAssigneeCode = record.Dedicated_Assignee.value[0].code;

    const decrementResponse = await decrementComponentReference(currentAssigneeCode, normalizedConfig);
    console.log({decrementResponse});

    Swal.fire({
      title: `${normalizedConfig.assignmentThresholdFieldCode} for ${record.Assignee.value[0].name} has been successfully decremented!`,
      icon: 'success',
      timer: 3000,
      timerProgressBar: true,
      allowEscapeKey: false,
      allowOutsideClick: false,
    }).then(() => {
      location.reload();
    });
  });
})(kintone.$PLUGIN_ID);
