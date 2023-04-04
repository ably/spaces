import Space from './Space.js';
import EventEmitter from './utilities/EventEmitter.js';
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

    const previousLocation = member.location;
    member.location = location;
    this.emit('locationUpdate', { member, currentLocation: location, previousLocation });
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
