import { ipcRenderer } from 'electron';
import { Component } from 'react';

import { vehicleInfos, vehicleStatuses } from '../static/index';

// TODO: Remove disable line comment when issue gets fixed (https://github.com/benmosher/eslint-plugin-import/pull/1304)
import { MessageType, VehicleUpdate, VehicleUI } from './types'; // eslint-disable-line import/named

/**
 * Updates vehicles being shown.
 */
export function updateVehicles(
  component: Component<{}, { vehicles: { [key: string]: VehicleUI } }>,
  ...vehicles: VehicleUpdate[]
): void {
  const { vehicles: thisVehicles } = component.state;
  const currentVehicles = thisVehicles;

  vehicles.forEach((vehicle): void => {
    /*
     * Checks if we have the corresponding information on that vehicle on vehicleInfos.
     * If not we will delete the vehicle from currentVehicles (will not throw an error if that
     * vehicle was not in the object of vehicles in the first place) and will log to the log
     * container.
     */
    if (vehicleInfos[vehicle.sid]) {
      currentVehicles[vehicle.sid] = {
        ...vehicle,
        ...vehicleInfos[vehicle.sid] as { name: string; type: string },
        status: vehicleStatuses[vehicle.status] as { type: MessageType; message: string },
      };
    } else {
      delete currentVehicles[vehicle.sid];
      ipcRenderer.send('post', 'updateMessage', {
        type: 'failure',
        message: `Received vehicle ID (${vehicle.sid}) in which no vehicle corresponds to`,
      });
    }
  });

  component.setState({ vehicles: currentVehicles });
}

/*
 * These functions will allow us to maintain mission states (starting missions, job, etc.)
 * I'll add explanation here soon. All explanations are in Slack right now.
 * The way we should name functions that interact with ipcRenderer are the following:
 * Assuming we have the notification "startMission", the function startMission() is the
 * callback to when the notification is received. The function sendStartMission() is the
 * function that sends out this notification.
 */

function sendStartMission(): void {
  ipcRenderer.send('post', 'startMission');
}

function sendStopMission(): void {
  ipcRenderer.send('post', 'stopMission');
}

function sendCompleteMission(index: number): void {
  ipcRenderer.send('post', 'completeMission', index);
}

export const mission = {
  sendStartMission,
  sendStopMission,
  sendCompleteMission,
};

function sendStartJob(data: {
  jobType: string;
  missionInfo: {};
}): void {
  ipcRenderer.send('post', 'startJob', data);
}

function sendPauseJob(): void {
  ipcRenderer.send('post', 'pauseJob');
}

function sendResumeJob(): void {
  ipcRenderer.send('post', 'resumeJob');
}

function sendCompleteJob(): void {
  ipcRenderer.send('post', 'completeJob');
}

export const job = {
  sendStartJob,
  sendPauseJob,
  sendResumeJob,
  sendCompleteJob,
};

/* eslint-disable no-bitwise */

/**
 * Converts a float number to a hex string.
 */
function toHexString(float: number): string {
  const getHex = (index: number): string => `00${index.toString(16)}`.slice(-2);

  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, float);
  return [0, 0, 0, 0].map((_, index): string => getHex(view.getUint8(index))).join('');
}

/**
 * Converts a hex string to a float number.
 */
function toFloat(hexString: string): number {
  const int = parseInt(hexString, 16);
  if (int > 0 || int < 0) {
    const sign = (int >>> 31) ? -1 : 1;
    let exp = ((int >>> 23) & 0xff) - 127;
    const mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
    let float = 0;

    for (let i = 0; i < mantissa.length; i += 1, exp -= 1) {
      if (parseInt(mantissa[i], 10)) {
        float += 2 ** exp;
      }
    }

    return float * sign;
  }

  return 0;
}

export const floatHex = { toHexString, toFloat };

/* eslint-enable no-bitwise */
