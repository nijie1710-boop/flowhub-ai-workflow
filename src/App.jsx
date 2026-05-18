import DemoBar from './components/DemoBar.jsx';
import MobileChrome from './components/MobileChrome.jsx';
import LegacyRuntime from './components/LegacyRuntime.jsx';
import Market from './pages/Market.jsx';
import Search from './pages/Search.jsx';
import Detail from './pages/Detail.jsx';
import Run from './pages/Run.jsx';
import Me from './pages/Me.jsx';
import Admin from './pages/Admin.jsx';
import Creator from './pages/Creator.jsx';
import Advertiser from './pages/Advertiser.jsx';
import Wizard from './pages/Wizard.jsx';

export default function App() {
  return (
    <>
      <DemoBar />
      <Market />
      <Search />
      <Detail />
      <Run />
      <Me />
      <Admin />
      <Creator />
      <Advertiser />
      <Wizard />
      <MobileChrome />
      <LegacyRuntime />
    </>
  );
}
