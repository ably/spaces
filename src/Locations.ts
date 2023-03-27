import Space from './Space';
import EventEmitter from './utilities/EventEmitter';
import { Types } from 'ably';

export default class Locations extends EventEmitter {
  constructor(public space: Space, private channel: Types.RealtimeChannelPromise) {
    super();
    this.channel.presence.subscribe(this.onPresenceUpdate);
  }

  private onPresenceUpdate(message: Types.PresenceMessage) {
    if (!['update', 'leave'].includes(message.action)) return;

    const { location } = message.data;
    const member = this.space.getMemberFromConnection(message.connectionId);

    this.emit('locationUpdate', { member, currentLocation: message.data, previousLocation: member.location });
    member.location = location;
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
