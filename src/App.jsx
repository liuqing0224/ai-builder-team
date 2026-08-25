import { AdminApp } from "./AdminApp.jsx";
import { PublicApp } from "./PublicApp.jsx";
import { TermDetailApp } from "./TermDetailApp.jsx";

export function App(){
  if(location.pathname.startsWith("/admin"))return <AdminApp/>;
  if(/^\/terms\/[^/]+\/?$/.test(location.pathname))return <TermDetailApp/>;
  return <PublicApp/>;
}
