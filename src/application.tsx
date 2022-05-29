import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from "react-query";

import { AppRouter } from './containers/AppRouter';
import { getDiv } from './stores/DeviceStateStore';


const queryClient = new QueryClient();

export async function run(id?: string): Promise<void> {
  const div = getDiv(id);
  const root = ReactDOM.createRoot(div);
  root.render((
    <QueryClientProvider client={queryClient}>
      <AppRouter/>
    </QueryClientProvider>
  ));
}
