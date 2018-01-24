import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom'

import Login from './components/auth/Login'
import CreateUser from './components/user/CreateUser'
import EditUser from './components/user/EditUser'
import UpdatePassword from './components/user/UpdatePassword'
import UserList from './components/user/UserList'
import SetSSID from './components/ssid/SetSSID'
import Upgrade from './components/upgrade/Upgrade'
import FileMgmt from './components/filemgmt/FileMgmt'

class App extends Component {
  render() {
    return (
      <div className="App">
        <BrowserRouter >
            <div>
                <Route exact path={"/"} component={Login} />
                <Route exact path={"/users/edit/:username/:permissions"} component={EditUser} />
                <Route exact path={"/create/user"} component={CreateUser} />
                <Route exact path={"/users"} component={UserList} />
                <Route exact path={"/set/ssid"} component={SetSSID} />
                <Route exact path={"/update/password"} component={UpdatePassword} />
                <Route exact path={"/upgrade"} component={Upgrade} />
                <Route exact path={"/filemgmt"} component={FileMgmt} />
            </div>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;
