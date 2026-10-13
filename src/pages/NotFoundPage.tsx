import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router';

import { Routes } from '@/config';


export function NotFoundPage() {
  return (
    <div className='mx-auto max-w-2xl px-6 py-20 text-center'>
      <AlertCircle className='mx-auto mb-6 size-20 text-danger'/>
      <h1 className='mb-4 text-4xl font-bold text-white'>Page Not Found</h1>
      <p className='mb-8 text-lg text-muted'>The page you're looking for doesn't exist or has been moved. (404 lol)</p>
      <Link to={Routes.HOME} className='btn btn-discord btn-lg'>Go Back Home</Link>
    </div>
  );
}
