import * as React from 'react';
import { Navigate } from 'react-router-dom';

import { Routes } from '../../constants';
import { useStore as useStoreUserMe } from '../../stores/UserMeStore';


export function AuthLoginCallbackPage() {
  const token = window.location.hash.slice(1);
  const setToken = useStoreUserMe((state) => state.setToken);
  setToken(token);

  return <Navigate to={Routes.HOME}/>;
}
