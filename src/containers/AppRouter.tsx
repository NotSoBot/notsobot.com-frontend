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


export function AppRouter() {
  return (
    <BrowserRouter>
      <RoutesSwitch>
        <Route path={Routes.HOME} element={<HomePage/>}/>
        <Route path={Routes.AUTH_LOGIN} element={<AuthLogin/>}/>
        <Route path={Routes.AUTH_LOGIN_CALLBACK} element={<AuthLoginCallbackPage/>}/>
        <Route path={Routes.AUTH_REDIRECT} element={<AuthRedirectPage/>}/>
        <Route path={Routes.COMMANDS} element={<CommandsPage/>}/>
        <Route path={Routes.FREQUENTLY_ASKED_QUESTIONS} element={<FAQPage/>}/>
        <Route path={Routes.FOXBOT} element={<FoxBot/>}/>
        <Route path={Routes.INVITE} element={<Invite/>}/>
        <Route path={Routes.LEGAL_PRIVACY} element={<PrivacyPage/>}/>
        <Route path={Routes.STATUS} element={<StatusPage/>}/>
        <Route path={Routes.SUPPORT_INVITE} element={<SupportInvite/>}/>
        <Route path='*' element={<ErrorPage/>}/>
      </RoutesSwitch>
    </BrowserRouter>
  );
}


function AuthLogin() {
  const user = useStoreUserMe((state) => state.user);

  if (!user) {
    window.location.replace(ApiEndpoints.PATH + ApiEndpoints.AUTH_LOGIN);
    return <Outlet/>;
  }
  return <Navigate to={Routes.HOME}/>;
}


function AuthRedirectPage() {
  return <Navigate to={Routes.COMMANDS}/>;
}


function FoxBot() {
  window.location.replace('https://discordapp.com/users/66078337084162048');
  return <Outlet/>;
}


function Invite() {
  window.location.replace(ApiEndpoints.PATH + ApiEndpoints.HELP_DISCORD_BOT);
  return <Outlet/>;
}


function SupportInvite() {
  window.location.replace(ApiEndpoints.PATH + ApiEndpoints.HELP_DISCORD_SERVER);
  return <Outlet/>;
}
