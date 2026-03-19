import React from "react";
import { DataGrid, GridToolbar } from '@mui/x-data-grid';

function Grid(props) {
    return (
        <div>
            <DataGrid className="table caption-top  shadow-lg p-3 mb-5 bg-body rounded"
                rows={props.rows}
                columns={props.columns}
                autoHeight
                density="comfortable"
                autosizeOnMount={true}
                disableRowSelectionOnClick
                initialState={{
                    pagination: {
                        paginationModel: { page: 0, pageSize: 5 },
                    },
                }}
                pageSizeOptions={[5, 10, 20]}
                localeText={{
                    columnMenuLabel: 'Menu',
                    columnMenuShowColumns: 'Mostrar columnas',
                    columnMenuManageColumns: 'Manejar columnas',
                    columnMenuFilter: 'Filtrar',
                    columnMenuHideColumn: 'Ocultar columna',
                    columnMenuUnsort: 'Unsort',
                    columnMenuSortAsc: 'Ordenar ASC',
                    columnMenuSortDesc: 'Ordernar DESC',
                    footerTotalRows: 'Total filas:',
                    footerTotalVisibleRows: (visibleCount, totalCount) =>
                        `${visibleCount.toLocaleString()} de ${totalCount.toLocaleString()}`,
                    footerRowSelected: (count) =>
                        count !== 1
                            ? `${count.toLocaleString()} filas seleccionadas`
                            : `${count.toLocaleString()} fila seleccionada`,
                }}

            />
        </div>
    )
}

export default Grid;