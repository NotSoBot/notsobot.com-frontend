import { RestTypes } from '../types';


export class User {
  avatar: null | string;
  blocked: boolean;
  bot: boolean;
  discriminator: string;
  flags: number;
  id: string;
  username: string;

  constructor(data: RestTypes.RawUser) {
    this.avatar = data.avatar;
    this.blocked = data.blocked;
    this.bot = data.bot;
    this.discriminator = data.discriminator;
    this.flags = data.flags;
    this.id = data.id;
    this.username = data.username;
  }
}


export class UserMe extends User {
  channelId: null | string;
  locale: null | string;
  optedOut: {content: null | string};
  premiumType: number;
  timezone: null | string;

  constructor(data: RestTypes.RawUserMe) {
    super(data);
    this.channelId = data.channel_id;
    this.locale = data.locale;
    this.optedOut = data.opted_out;
    this.premiumType = data.premium_type;
    this.timezone = data.timezone;
  }
}
