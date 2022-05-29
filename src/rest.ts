import { ApiEndpoints } from './endpoints';
import { useStore as useStoreUserMe } from './stores/UserMeStore';
import { User, UserMe } from './structures';
import { RestTypes } from './types';


export interface RequestOptions extends RequestInit {
  params?: {[key: string]: any},
  query?: {[key: string]: any},
}

export interface RequestApiOptions extends RequestOptions {
  useAuth?: boolean,
}

export async function request(input: string, options?: RequestOptions): Promise<any> {
  options = Object.assign({}, options);

  if (typeof(options.params) === 'object') {
    input = ApiEndpoints.PATH + input;
    for (let key in options) {
      // put it into input
    }
  }

  if (typeof(options.query) === 'object') {
    // put it into input
  }

  return await window.fetch(input, options);

  const response = await window.fetch(input, options);
  if (!response.ok) {
    // do something with it
    throw new Error('lol');
  }
  return await response.json();
}


export async function requestApi(input: string, options?: RequestApiOptions): Promise<any> {
  input = ApiEndpoints.PATH + input;

  options = Object.assign({}, options);
  if (options.useAuth !== false) {
    const { token } = useStoreUserMe.getState();
    if (token) {
      const headers = new Headers(options.headers);
      if (!headers.has('authorization')) {
        headers.set('authorization', token);
      }
      options.headers = headers;
    }
  }

  return request(input, options);
}


export async function fetchCommands(): Promise<RestTypes.Commands> {
  const response = await requestApi(ApiEndpoints.COMMANDS, {
    useAuth: false,
  });
  return (response.ok) ? await response.json() : [];
};


export async function fetchInfoDiscord(): Promise<RestTypes.InfoDiscord | null> {
  const response = await requestApi(ApiEndpoints.INFO_DISCORD, {
    useAuth: false,
  });
  return (response.ok) ? await response.json() : null;
}



export async function fetchUserMe(): Promise<UserMe | null> {
  const response = await requestApi(ApiEndpoints.USER_ME);

  const data: RestTypes.RawUserMe = (response.ok) ? await response.json() : null;
  return (data) ? new UserMe(data) : null;
}
