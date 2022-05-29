import { InfoDiscordShardStates } from './constants';


export namespace RestTypes {
  export type Commands = Array<RawCommand>;
  export type InfoDiscord = RawInfoDiscord;


  export interface RawCommand {
    enabled: boolean,
    id: string,
    metadata: Array<RawCommandMetadata>,
  }

  export interface RawCommandMetadata {
    aliases: Array<string>,
    args: Array<{aliases: Array<string>, name: string, prefixes: Array<string>}>,
    category: string,
    description: null | string,
    dmable: boolean,
    enabled: boolean,
    examples: Array<string>,
    name: string,
    ratelimits: Array<{duration: number, limit: number, type: string}>,
    type: number,
    usage: string,
  }

  export interface RawInfoDiscord {
    clusters: Array<RawInfoDiscordCluster>,
    shard_count: number,
    shards_per_cluster: number,
  }

  export interface RawInfoDiscordCluster {
    cluster_id: number,
    last_refresh: string,
    ram_usage: number,
    shards: Array<RawInfoDiscordClusterShard>,
  }

  export interface RawInfoDiscordClusterShard {
    cluster_id: number,
    counts: {
      applications: number,
      channel_threads: number,
      channels: number,
      emojis: number,
      events: number,
      guilds: number,
      member_count: number,
      members: number,
      messages: number,
      permission_overwrites: number,
      presence_activites: number,
      presences: number,
      roles: number,
      stage_instances: number,
      typings: number,
      users: number,
      voice_states: number,
    },
    shard_id: number,
    status: InfoDiscordShardStates,
  }

  export interface RawUser {
    avatar: string | null,
    blocked: boolean,
    bot: boolean,
    discriminator: string,
    flags: number,
    id: string,
    username: string,
  }

  export interface RawUserMe extends RawUser {
    channel_id: null | string,
    locale: null | string,
    opted_out: {
      content: null | string,
    },
    premium_type: number,
    timezone: null | string,
  }
}
