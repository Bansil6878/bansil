/*
 * Copyright (c) 2011-2022, Zingaya, Inc. All rights reserved.
 */

import React from 'react';
import {View, Text} from 'react-native';
//@ts-ignore
import {Voximplant} from 'react-native-voximplant';

import {IParticipant} from '../../Utils/types';

import MicrophoneIconDisable from '../../Assets/Icons/endpointMuteIcon.svg';
import styles from './styles';

interface IProps {
  participant: IParticipant;
  stylesForCard: object;
  stylesForLastCard: object;
}

const ParticipantCard = ({
  participant,
  stylesForCard,
  stylesForLastCard,
}: IProps) => {
  return (
    <View
      style={[
        styles.participantWrapper,
        participant.isActiveVoice && styles.activeVoice,
        stylesForCard,
        stylesForLastCard,
      ]}>
      <Voximplant.VideoView
        style={styles.selfview}
        videoStreamId={participant.streamId}
        scaleType={Voximplant.RenderScaleType.SCALE_FILL}
        showOnTop={true}
      />
      <View style={styles.participantWrapperInfo}>
        <Text style={styles.participantText}>{participant.name}</Text>
        {participant.isMuted && (
          <View style={styles.participantIconWrapper}>
            <MicrophoneIconDisable style={styles.participantIcon} />
          </View>
        )}
      </View>
    </View>
  );
};

export default ParticipantCard;
