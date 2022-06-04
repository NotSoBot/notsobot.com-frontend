import * as React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes as RoutesSwitch } from 'react-router-dom';

import { Routes } from '../constants';
import { ApiEndpoints } from '../endpoints';

import { useStore as useStoreUserMe } from '../stores/UserMeStore';

import { AuthLoginCallbackPage } from './pages/AuthLoginCallbackPage';
import { CommandsPage } from './pages/CommandsPage';
import { ErrorPage } from './pages/ErrorPage';
import { FAQPage } from './pages/FAQPage';
import { HomePage } from './pages/HomePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { StatusPage } from './pages/StatusPage';


export function AuthLogin() {
  const user = useStoreUserMe((state) => state.user);

  if (!user) {
    window.location.replace(ApiEndpoints.PATH + ApiEndpoints.AUTH_LOGIN);
    return <Outlet/>;
  }
  return <Navigate to={Routes.HOME}/>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RoutesSwitch>
        <Route path={Routes.HOME} element={<HomePage/>}/>
        <Route path={Routes.AUTH_LOGIN} element={<AuthLogin/>}/>
        <Route path={Routes.AUTH_LOGIN_CALLBACK} element={<AuthLoginCallbackPage/>}/>
        <Route path={Routes.COMMANDS} element={<CommandsPage/>}/>
        <Route path={Routes.FREQUENTLY_ASKED_QUESTIONS} element={<FAQPage/>}/>
        <Route path={Routes.LEGAL_PRIVACY} element={<PrivacyPage/>}/>
        <Route path={Routes.STATUS} element={<StatusPage/>}/>
        <Route path='*' element={<ErrorPage/>}/>
      </RoutesSwitch>
    </BrowserRouter>
  );
}
