import {
  getParsedConfig,
  normalizeConfig,
  getProcessManagement,
  decrementComponentReference,
  suggestAssignee,
} from './helper/kintone.js';
import { Button } from 'kintone-ui-component';
import Swal from 'sweetalert2';
import { DateTime } from 'luxon';

(function (PLUGIN_ID) {
  let processManagement = null;

  kintone.events.on('app.record.detail.show', async (e) => {
    const { record } = e;
    const currentStatus = record.Status.value;

    processManagement = await getProcessManagement();

    const states = processManagement.states;

    let initialStatus;

    for (const state in states) {
      if (states[state].index === '0') {
        initialStatus = state;
        break;
      }
    }

    const relatedAction = processManagement.actions.find((action) => {
      return action.from === initialStatus;
    });

    if (currentStatus !== initialStatus) {
      return e;
    }

    const config = kintone.plugin.app.getConfig(PLUGIN_ID);
    const parsedConfig = getParsedConfig(config);
    const normalizedConfig = normalizeConfig(parsedConfig);

    const headerElement = kintone.app.record.getHeaderMenuSpaceElement();

    const suggestAssigneeButton = new Button({
      text: 'Suggest Assignee',
      type: 'submit',
      id: 'suggest-assignee',
    });

    headerElement.appendChild(suggestAssigneeButton);
    suggestAssigneeButton.addEventListener('click', async () => {
      await suggestAssignee(normalizedConfig, record, relatedAction);
    });

    return e;
  });

  kintone.events.on('app.record.detail.process.proceed', async (e) => {
    const { record } = e;
    const states = processManagement.states;
    const nextStatus = e.nextStatus.value;
    const currentDate = DateTime.local().toISODate();

    const lastState = Object.keys(states).find((state) => {
      return (
        states[state].index === (Object.keys(states).length - 1).toString()
      );
    });

    if (nextStatus !== lastState) {
      if (record?.In_Progress_Actual) {
        if (nextStatus === 'In Progress') {
          record.In_Progress_Actual.value = currentDate;
        }

        if (nextStatus === 'Awaiting Shipment') {
          record.Awaiting_Shipment_Actual.value = currentDate;
        }
      }

      return e;
    }

    if (nextStatus === 'Resolved') {
      record.Resolved_Actual.value = currentDate;

      const assignmentDateLx = DateTime.fromISO(record.Assignment_Date.value);

      const resolvedDateLx = DateTime.fromISO(record.Resolved_Actual.value);

      let daysTaken = resolvedDateLx.diff(assignmentDateLx, 'days').days;

      let daysHolder = assignmentDateLx;

      while (daysHolder < resolvedDateLx) {
        const day = daysHolder.weekday;

        if (day === 6 || day === 7) {
          daysTaken--;
        }

        daysHolder = daysHolder.plus({ days: 1 });
      }
      record.Days_Taken.value = daysTaken + 1;
    }

    const config = kintone.plugin.app.getConfig(PLUGIN_ID);
    const parsedConfig = getParsedConfig(config);
    const normalizedConfig = normalizeConfig(parsedConfig);

    const currentAssigneeCode = record.Dedicated_Assignee.value[0].code;
    const currentAssigneeName = record.Dedicated_Assignee.value[0].name;

    await decrementComponentReference(currentAssigneeCode, normalizedConfig);

    Swal.fire({
      title: `${normalizedConfig.assignmentThresholdFieldCode} for ${currentAssigneeName} has been successfully decremented!`,
      icon: 'success',
      timer: 3000,
      timerProgressBar: true,
      allowEscapeKey: false,
      allowOutsideClick: false,
    }).then(() => {
      location.reload();
    });

    return e;
  });

  kintone.events.on('app.record.edit.submit', async (e) => {
    const { record } = e;
    if (!record?.IPD) return e;

    const ipd = record.In_Progress_Deadline_Final.value;
    const asd = record.Awaiting_Shipment_Deadline_Final.value;
    const rd = record.Resolved_Deadline_Final.value;

    record.IPD.value = ipd;
    record.ASD.value = asd;
    record.RD.value = rd;

    const assignmentDate = record.Assignment_Date.value;
    const resolvedActual = record.Resolved_Actual.value;

    const assignmentDateLx = DateTime.fromISO(assignmentDate);
    const resolvedActualLx = DateTime.fromISO(resolvedActual);

    let daysTaken = resolvedActualLx.diff(assignmentDateLx, 'days').days;

    let daysHolder = assignmentDateLx;

    while (daysHolder < resolvedActualLx) {
      const day = daysHolder.weekday;

      if (day === 6 || day === 7) {
        daysTaken--;
      }

      daysHolder = daysHolder.plus({ days: 1 });
    }

    record.Days_Taken.value = daysTaken + 1;
    return e;
  });
})(kintone.$PLUGIN_ID);
