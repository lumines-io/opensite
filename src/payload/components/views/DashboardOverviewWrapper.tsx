import React from 'react';
import type { AdminViewServerProps } from 'payload';
import { DashboardOverview } from './DashboardOverview';

// Dashboard wrapper - just renders the client component directly
// Payload's admin layout already provides header/nav, so we don't use DefaultTemplate here
export const DashboardOverviewWrapper: React.FC<AdminViewServerProps> = () => {
  return <DashboardOverview />;
};

export default DashboardOverviewWrapper;
