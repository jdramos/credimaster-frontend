import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';


function SidebarPro() {

    return (
        <div style={{ display: 'flex', height: '100%', minHeight: '400px' }}>
            <Sidebar>
                <Menu>
                    <MenuItem> Documentation</MenuItem>
                    <MenuItem> Calendar</MenuItem>
                    <MenuItem> E-commerce</MenuItem>
                    <MenuItem> Examples</MenuItem>
                </Menu>
            </Sidebar>

        </div>

    )

}

export default SidebarPro;