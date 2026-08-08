import { draw } from '../draw.js';
import { buildTowerFeature, csvRowToTowerFields } from '../towerFeature.js';
import { createTable } from '../ui/table.js';
import { deleteAll } from '../reset.js';
import { addTower } from '../towerState.js';

// `Papa` (Papa Parse) is a global from lib/papaparse.min.js.

// Import cell towers from a .csv file. Expected columns:
//   lat,lon,name,desc,fill,marker,angle1,angle2,radius,opacity
// plus these optional ones:
//   gradient                        true/false, draw the cell as a graduated cone
//   cellid,lac,mcc,mnc,celltype     the cell's network identity (see cellIdentity.js)
export function importCSV() {
    const inp_file = document.createElement('input');
    inp_file.setAttribute('type', 'file');
    inp_file.setAttribute('accept', '.csv');
    inp_file.click();
    inp_file.addEventListener('change', function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        Papa.parse(inp_file.files[0], {
            header: true,
            dynamicTyping: true,
            complete: function (results) {
                deleteAll();
                for (const cell of results.data) {
                    const { marker, sectors } = buildTowerFeature(csvRowToTowerFields(cell));
                    addTower(marker, sectors);
                    createTable(draw.getAll());
                }
            },
        });
    });
}
