export type Route = {
  $id: string;
  name: string;
  createdBy: string;
  $createdAt: string;
};

export type RouteInput = {
  name: string;
};

export type ManagerRouteAccess = {
  $id: string;
  managerId: string;
  routeId: string;
};
