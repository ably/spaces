import Space from './Space';
import EventEmitter from './utilities/EventEmitter';
import { Types } from 'ably';

type LocationUpdate = 'locationUpdate';

type LocationEventMap = Record<LocationUpdate, any>;

export default class Locations extends EventEmitter<LocationEventMap> {
  constructor(public space: Space, private channel: Types.RealtimeChannelPromise) {
    super();
    this.channel.presence.subscribe(this.onPresenceUpdate);
  }

  private onPresenceUpdate(message: Types.PresenceMessage) {
    if (!['update', 'leave'].includes(message.action)) return;

    const { location } = message.data;
    const member = this.space.getMemberFromConnection(message.connectionId);

    if (member) {
      const previousLocation = member.location;
      member.location = location;
      this.emit('locationUpdate', { member, currentLocation: location, previousLocation });
    }
  }

  set(location: any) {
    const self = this.space.getSelf();
    if (!self) {
      throw new Error('Must enter a space before setting a location');
    }
    return this.channel.presence.update({
      profileData: self.profileData,
      location,
    });
  }
}
