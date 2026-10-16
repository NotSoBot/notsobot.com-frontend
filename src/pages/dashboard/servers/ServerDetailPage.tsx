import { Navigate, useParams } from 'react-router';

import { dashboardServerPath } from './guildMeta';


// the old full page url, servers open as a modal over the server list now (`ServerDetailsModal`)
export function ServerDetailPage() {
  const { guildId = '' } = useParams();
  return <Navigate to={dashboardServerPath(guildId)} replace/>;
}
