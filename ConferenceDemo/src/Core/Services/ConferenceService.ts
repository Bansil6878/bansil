/*
 * Copyright (c) 2011-2022, Zingaya, Inc. All rights reserved.
 */

import { useRef } from 'react';
//@ts-ignore
import {Voximplant} from 'react-native-voximplant';
import { useDispatch } from 'react-redux';

import { useUtils } from '../../Utils/useUtils';
import { RootReducer, store } from '../Store';

import {
  changeCallState,
  removeVideoStreamAdded,
  removeVideoStreamRemoved,
  addParticipant,
  localVideoStreamAdded,
  localVideoStreamRemoved,
  endpointAdded,
  endpointRemoved,
  setError,
  removeAllParticipants,
  endpointVoiceActivityStarted,
  endpointVoiceActivityStopped,
  endpointMuted,
} from '../Store/conference/actions';

export const ConferenceService = () => {
  const Client = Voximplant.getInstance();
  const CameraManager = Voximplant.Hardware.CameraManager.getInstance();
  const AudioDeviceManager = Voximplant.Hardware.AudioDeviceManager.getInstance();

  const cameraType = Voximplant.Hardware.CameraType;

  const { loginReducer: { user } }: RootReducer = store.getState();

  const dispatch = useDispatch();
  const { convertParticitantModel } = useUtils();

  const currentConference = useRef<Voximplant.Call>();

  const startConference = async (conference: string, localVideo: boolean) => {
    const callSettings = {
      video: {
        sendVideo: localVideo,
        receiveVideo: true,
      },
    };
    currentConference.current = await Client.callConference(conference, callSettings);
    const model = convertParticitantModel({id: currentConference.current?.callId, name: user, isMuted: false});
    dispatch(addParticipant(model));
    subscribeToConferenceEvents();
  }

  const subscribeToConferenceEvents = () => {
    currentConference.current?.on(Voximplant.CallEvents.Connected, (callEvent: any) => {
      dispatch(changeCallState('Connected'));
    });
    currentConference.current?.on(Voximplant.CallEvents.Disconnected, (callEvent: any) => {
      dispatch(changeCallState('Disconnected'));
      dispatch(removeAllParticipants());
      unsubscribeFromConferenceEvents();
      currentConference.current = null;
    });
    currentConference.current?.on(Voximplant.CallEvents.Failed, (callEvent: any) => {
      dispatch(changeCallState('Failed'));
      dispatch(setError(callEvent.reason));
      unsubscribeFromConferenceEvents();
    });
    currentConference.current?.on(Voximplant.CallEvents.LocalVideoStreamAdded, (callEvent: any) => {
      const model = convertParticitantModel({id: callEvent.call.callId, name: user, streamId: callEvent.videoStream.id});
      dispatch(localVideoStreamAdded(model));
    });
    currentConference.current?.on(Voximplant.CallEvents.LocalVideoStreamRemoved, (callEvent: any) => {
      const model = convertParticitantModel({id: callEvent.call.callId, name: user, streamId: ''});
      dispatch(localVideoStreamRemoved(model));
    });
    currentConference.current?.on(Voximplant.CallEvents.EndpointAdded, (callEvent: any) => {
      if (currentConference.current?.callId !== callEvent.endpoint.id) {
        const model = convertParticitantModel({id: callEvent.endpoint.id, name: callEvent.displayName, streamId: '', isMuted: false});
        dispatch(endpointAdded(model))
        subscribeToEndpointEvents(callEvent.endpoint);
      }
    });
    currentConference.current?.on(Voximplant.CallEvents.MessageReceived, (callEvent: any) => {
      try {
        const message = JSON.parse(callEvent.text);
        const model = convertParticitantModel({id: message.id, isMuted: message.isMuted});
        dispatch(endpointMuted(model))
      } catch (error) {
        console.log('JSON.parse [ERROR]: MessageReceived text =>', callEvent.text);
      }
    });
  }

  const subscribeToEndpointEvents = (endpoint: Voximplant.Endpoint) => {
    endpoint.on(
      Voximplant.EndpointEvents.RemoteVideoStreamAdded,
      (endpointEvent: any) => {
        const model = convertParticitantModel({id: endpointEvent.endpoint.id, streamId: endpointEvent.videoStream.id});
        dispatch(removeVideoStreamAdded(model));
      },
    );
    endpoint.on(
      Voximplant.EndpointEvents.RemoteVideoStreamRemoved,
      (endpointEvent: any) => {
        const model = convertParticitantModel({id: endpointEvent.endpoint.id});
        dispatch(removeVideoStreamRemoved(model));
      },
    );
    endpoint.on(
      Voximplant.EndpointEvents.VoiceActivityStarted,
      (endpointEvent: any) => {
        const model = convertParticitantModel({id: endpointEvent.endpoint.id});
        dispatch(endpointVoiceActivityStarted(model));
      }
    );
    endpoint.on(
      Voximplant.EndpointEvents.VoiceActivityStopped,
      (endpointEvent: any) => {
        const model = convertParticitantModel({id: endpointEvent.endpoint.id});
        dispatch(endpointVoiceActivityStopped(model));
      }
    );
    endpoint.on(
      Voximplant.EndpointEvents.Removed,
      (endpointEvent: any) => {
        const model = convertParticitantModel({ id: endpointEvent.endpoint.id });
        dispatch(endpointRemoved(model));
        unsubscribeFromEndpointEvents(endpointEvent.enpoint)
      },
    );
  }

  const unsubscribeFromConferenceEvents = () => {
    currentConference.current?.off();
  };

  const unsubscribeFromEndpointEvents = (endpoint: Voximplant.Endpoint) => {
    endpoint?.off();
  };

  const endConference = () => {
    hangUp();
  };

  const hangUp = () => {
    currentConference.current?.hangup();
  };

  const muteAudio = (isMuted: boolean) => {
    currentConference.current?.sendAudio(isMuted);
    currentConference.current?.sendMessage(JSON.stringify({muted: !isMuted}));
  };

  const sendLocalVideo = async (isSendVideo: boolean) => {
    await currentConference.current.sendVideo(isSendVideo);
  };

  return {
    startConference,
    endConference,
    muteAudio,
    sendLocalVideo,
    CameraManager,
    cameraType,
    AudioDeviceManager,
  };
};