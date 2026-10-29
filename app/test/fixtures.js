/* Made-up example data for tests and for seeding the live prototype.
   Every document carries example: true so the office can clear it later.
   makeSeed(nowMs) -> {collection: {id: doc}} */
(function (root) {
  'use strict';
  function photo(label, hue) {
    // a simple drawn placeholder (pallets on a dock) so photo boxes look real
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">' +
      '<rect width="480" height="360" fill="hsl(' + hue + ',18%,78%)"/>' +
      '<rect y="250" width="480" height="110" fill="hsl(' + hue + ',10%,55%)"/>' +
      '<g fill="hsl(30,45%,52%)"><rect x="70" y="232" width="150" height="18"/><rect x="260" y="232" width="150" height="18"/></g>' +
      '<g fill="hsl(' + hue + ',25%,92%)" stroke="hsl(' + hue + ',15%,60%)" stroke-width="3"><rect x="76" y="120" width="138" height="112" rx="6"/><rect x="266" y="140" width="138" height="92" rx="6"/></g>' +
      '<rect x="0" y="0" width="480" height="44" fill="rgba(11,27,48,.72)"/>' +
      '<text x="16" y="29" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#fff">' + label + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function makeSeed(now) {
    now = now || Date.now();
    var MIN = 60000, H = 60 * MIN, D = 24 * H;
    function iso(ms) { return new Date(ms).toISOString(); }
    function at(dayOffset, hh, mm) { var d = new Date(now + dayOffset * D); d.setHours(hh, mm || 0, 0, 0); return d.toISOString(); }
    var ex = true;
    function alerts(text, email) {
      var o = {};
      ['booked', 'eta', 'arrived', 'waiting', 'started', 'damage', 'done', 'secured', 'friday'].forEach(function (k) {
        o[k] = { text: text.indexOf(k) >= 0, email: email.indexOf(k) >= 0 };
      });
      return o;
    }
    var customers = {
      c_sierra: { name: 'Sierra Freight Lines', code: 'SIERRA', dock: 'reno', autoApproveUnder: null, notes: 'Made-up example company.',
        contacts: [
          { name: 'Dana Ortiz', role: 'Dispatcher', phone: '775-555-0101', email: 'dispatch@example.com', alerts: alerts(['arrived', 'started', 'damage', 'done', 'secured'], ['booked', 'damage', 'done', 'friday']) },
          { name: 'Chris Lee', role: 'Owner', phone: '775-555-0102', email: 'owner@example.com', alerts: alerts(['damage'], ['damage', 'friday']) }
        ], createdAt: iso(now - 40 * D), example: ex },
      c_bay: { name: 'Bay Area Logistics', code: 'BAYLOG', dock: 'reno', autoApproveUnder: 50, notes: 'Made-up example company.',
        contacts: [{ name: 'Priya Shah', role: 'Ops manager', phone: '510-555-0144', email: 'ops@example.net', alerts: alerts(['arrived', 'damage', 'done'], ['done', 'damage', 'friday']) }],
        createdAt: iso(now - 90 * D), example: ex },
      c_truckee: { name: 'Truckee Supply Co', code: 'TRUCKEE', dock: 'reno', autoApproveUnder: null, notes: 'Made-up example company.',
        contacts: [{ name: 'Sam Patel', role: 'Dispatcher', phone: '530-555-0177', email: 'dispatch@example.org', alerts: alerts(['arrived', 'started', 'done'], ['friday']) }],
        createdAt: iso(now - 15 * D), example: ex }
    };
    var photos = {
      ph_ex1: { data: photo('Example: torn wrap, wide shot', 210), at: iso(now - 2 * H), example: ex },
      ph_ex2: { data: photo('Example: torn wrap, close-up', 200), at: iso(now - 2 * H), example: ex },
      ph_ex3: { data: photo('Example: pallets staged', 150), at: iso(now - 2 * H), example: ex },
      ph_ex4: { data: photo('Example: bill of lading', 45), at: iso(now - 30 * MIN), example: ex },
      ph_ex5: { data: photo('Example: nose of trailer', 190), at: iso(now - D), example: ex },
      ph_ex6: { data: photo('Example: middle, load bars', 180), at: iso(now - D), example: ex },
      ph_ex7: { data: photo('Example: tail, straps', 170), at: iso(now - D), example: ex },
      ph_ex8: { data: photo('Example: bars close-up', 160), at: iso(now - D), example: ex },
      ph_ex9: { data: photo('Example: seal 448120', 20), at: iso(now - D), example: ex }
    };
    function h(ms, text, by) { return { at: iso(ms), by: by || '', text: text }; }
    var trucks = {
      t_ex1: { customerId: 'c_sierra', code: '4821', dock: 'reno', kind: 'drop', apptAt: iso(now + 2 * H), status: 'booked',
        carrier: 'Sierra Freight Lines', truckNo: '118', trailerNo: '53-2207', driverName: 'Miguel Santos', driverCell: '775-555-0142', driverLang: 'es',
        tracking: 'link', trackUrl: '', eta: { at: iso(now + 100 * MIN), source: 'driver', updatedAt: iso(now - 20 * MIN), note: '' },
        loads: [
          { id: 'l1', ref: 'PO-55120', pallets: 12, weight: 14400, pieces: 0, destination: 'Costco Sparks', stackable: false, hazmat: false, notes: 'Floor load these first' },
          { id: 'l2', ref: 'PO-55121', pallets: 6, weight: 7200, pieces: 0, destination: 'Hold for pickup', stackable: true, hazmat: false, notes: '' }
        ], loadOrder: true, paperwork: [],
        history: [h(now - 26 * H, 'Booked by Dana Ortiz', 'Client'), h(now - 20 * MIN, 'Driver set ETA', 'Driver')],
        createdAt: iso(now - 26 * H), createdBy: 'client', example: ex },
      t_ex2: { customerId: 'c_bay', code: '3307', dock: 'reno', kind: 'drop', apptAt: iso(now - 40 * MIN), status: 'arrived',
        carrier: 'Westline Transport', truckNo: '42', trailerNo: 'WL-8810', driverName: 'Ravi Kumar', driverCell: '510-555-0190', driverLang: 'pa',
        tracking: 'none', loads: [{ id: 'l1', ref: 'BOL-77812', pallets: 26, weight: 31200, pieces: 0, destination: 'Reno DC', stackable: false, hazmat: false, notes: '' }],
        paperwork: ['p:ph_ex4'], checkedInAt: iso(now - 22 * MIN), checkedInBy: 'kiosk',
        history: [h(now - 50 * H, 'Booked by Priya Shah', 'Client'), h(now - 22 * MIN, 'Checked in at the kiosk', 'Kiosk')],
        createdAt: iso(now - 50 * H), createdBy: 'client', example: ex },
      t_ex3: { customerId: 'c_truckee', code: '5590', dock: 'reno', kind: 'both', apptAt: iso(now - 70 * MIN), status: 'arrived',
        carrier: 'Truckee Supply Co', truckNo: '7', trailerNo: 'TS-0007', driverName: 'Olena Koval', driverCell: '530-555-0123', driverLang: 'uk',
        tracking: 'samsara', trackUrl: 'https://cloud.samsara.com/o/0000/fleet/viewer/example',
        loads: [{ id: 'l1', ref: 'SO-1902', pallets: 8, weight: 6400, pieces: 0, destination: 'Drop here', stackable: true, hazmat: false, notes: '' },
          { id: 'l2', ref: 'PU-1903', pallets: 10, weight: 9800, pieces: 0, destination: 'Pick up for Truckee', stackable: false, hazmat: false, notes: 'Pickup: load after unloading' }],
        paperwork: [], checkedInAt: iso(now - 48 * MIN), checkedInBy: 'kiosk',
        history: [h(now - 30 * H, 'Booked by Sam Patel', 'Client'), h(now - 48 * MIN, 'Checked in at the kiosk', 'Kiosk')],
        createdAt: iso(now - 30 * H), createdBy: 'client', example: ex },
      t_ex4: { customerId: 'c_sierra', code: '6614', dock: 'reno', kind: 'drop', apptAt: iso(now - 75 * MIN), status: 'working',
        carrier: 'Sierra Freight Lines', truckNo: '121', trailerNo: '53-2219', driverName: 'Tom Becker', driverCell: '775-555-0150', driverLang: 'en',
        tracking: 'link', eta: { at: iso(now - 70 * MIN), source: 'driver', updatedAt: iso(now - 3 * H) },
        loads: [{ id: 'l1', ref: 'PO-55098', pallets: 22, weight: 26400, pieces: 0, destination: 'Reno DC', stackable: false, hazmat: false, notes: '' }],
        paperwork: [], checkedInAt: iso(now - 62 * MIN), checkedInBy: 'kiosk', startedAt: iso(now - 25 * MIN), door: '3', crewName: 'Alex',
        history: [h(now - 3 * D, 'Booked by Dana Ortiz', 'Client'), h(now - 62 * MIN, 'Checked in at the kiosk', 'Kiosk'), h(now - 25 * MIN, 'Unloading started at door 3', 'Alex')],
        createdAt: iso(now - 3 * D), createdBy: 'client', example: ex },
      t_ex5: { customerId: 'c_bay', code: '2286', dock: 'reno', kind: 'drop', apptAt: iso(now - 4 * H), status: 'done',
        carrier: 'Westline Transport', truckNo: '40', trailerNo: 'WL-8802', driverName: 'Jas Gill', driverCell: '510-555-0191', driverLang: 'pa',
        tracking: 'none', loads: [{ id: 'l1', ref: 'BOL-77790', pallets: 18, weight: 21600, pieces: 0, destination: 'Reno DC', stackable: false, hazmat: false, notes: '' }],
        paperwork: [], checkedInAt: iso(now - 3.8 * H), checkedInBy: 'kiosk', startedAt: iso(now - 3.5 * H), doneAt: iso(now - 2.6 * H), door: '5', crewName: 'Jordan',
        counts: { l1: 18 }, countNote: '', photos: ['p:ph_ex3'], damageIds: ['d_ex1'],
        history: [h(now - 2 * D, 'Booked by Priya Shah', 'Client'), h(now - 3.8 * H, 'Checked in at the kiosk', 'Kiosk'), h(now - 3.5 * H, 'Unloading started at door 5', 'Jordan'),
          h(now - 3.1 * H, 'Damage reported: 2 pallets, torn wrap', 'Jordan'), h(now - 2.6 * H, 'Done: 18 of 18 pallets counted', 'Jordan')],
        createdAt: iso(now - 2 * D), createdBy: 'client', example: ex },
      t_ex6: { customerId: 'c_sierra', code: '7702', dock: 'reno', kind: 'pick', apptAt: at(1, 9, 0), status: 'booked',
        carrier: 'Sierra Freight Lines', truckNo: '', trailerNo: '', driverName: '', driverCell: '', driverLang: 'en', tracking: 'self',
        loads: [{ id: 'l1', ref: 'PU-55130', pallets: 20, weight: 24000, pieces: 0, destination: 'Sacramento', stackable: false, hazmat: false, notes: 'Needs load bars' }],
        paperwork: [], history: [h(now - 5 * H, 'Booked by Dana Ortiz', 'Client')], createdAt: iso(now - 5 * H), createdBy: 'client', example: ex },
      t_ex7: { customerId: 'c_sierra', code: '1930', dock: 'reno', kind: 'pick', apptAt: iso(now - D - 2 * H), status: 'done',
        carrier: 'Sierra Freight Lines', truckNo: '115', trailerNo: '53-2190', driverName: 'Luis Romero', driverCell: '775-555-0161', driverLang: 'es', tracking: 'link',
        loads: [{ id: 'l1', ref: 'PU-55077', pallets: 24, weight: 28800, pieces: 0, destination: 'Fresno', stackable: false, hazmat: false, notes: '' }],
        paperwork: [], checkedInAt: iso(now - D - 2 * H + 5 * MIN), checkedInBy: 'kiosk', startedAt: iso(now - D - 2 * H + 20 * MIN), doneAt: iso(now - D - H), door: '2', crewName: 'Alex',
        counts: { l1: 24 }, photos: [],
        secure: { gear: { plywood: { qty: 6, owner: 'ours' }, bars: { qty: 2, owner: 'ours' }, straps: { qty: 4, owner: 'driver' }, airbags: { qty: 0, owner: 'ours' } },
          tags: ['B-104', 'B-117'], seal: '448120', photos: { nose: 'p:ph_ex5', middle: 'p:ph_ex6', tail: 'p:ph_ex7', closeup: 'p:ph_ex8', seal: 'p:ph_ex9' },
          confidence: 5, note: '', signedBy: 'Alex', signature: 'Alex M.', checkedRows: true, signedAt: iso(now - D - H) },
        history: [h(now - 4 * D, 'Booked by Dana Ortiz', 'Client'), h(now - D - 2 * H + 5 * MIN, 'Checked in at the kiosk', 'Kiosk'),
          h(now - D - 2 * H + 20 * MIN, 'Loading started at door 2', 'Alex'), h(now - D - H, 'Secured: confidence 5 of 5, seal 448120', 'Alex'), h(now - D - H, 'Done: 24 of 24 pallets loaded', 'Alex')],
        createdAt: iso(now - 4 * D), createdBy: 'client', example: ex },
      t_ex8: { customerId: 'c_bay', code: '8145', dock: 'sac', kind: 'drop', apptAt: iso(now + 3 * H), status: 'booked',
        carrier: 'Bay Area Logistics', truckNo: '9', trailerNo: '', driverName: 'Kevin Tran', driverCell: '', driverLang: 'en', tracking: 'none',
        loads: [{ id: 'l1', ref: 'BOL-77830', pallets: 14, weight: 16800, pieces: 0, destination: 'North Highlands', stackable: true, hazmat: false, notes: '' }],
        paperwork: [], history: [h(now - 8 * H, 'Booked by Priya Shah', 'Client')], createdAt: iso(now - 8 * H), createdBy: 'client', example: ex }
    };
    var damage = {
      d_ex1: { truckId: 't_ex5', customerId: 'c_bay', loadId: 'l1', ref: 'BOL-77790', at: iso(now - 3.1 * H), by: 'Jordan', pallets: 2,
        kinds: ['Torn wrap'], what: 'Shrink wrap torn on 2 pallets, boxes leaning. Product looks OK.', photos: ['p:ph_ex1', 'p:ph_ex2'],
        fixLines: [{ label: 'Rewrap pallet', qty: 2, rate: 15 }, { label: 'Restack boxes (labor, hours)', qty: 0.5, rate: 120 }],
        status: 'waiting', example: ex },
      d_ex2: { truckId: 't_ex7', customerId: 'c_sierra', loadId: 'l1', ref: 'PU-55077', at: iso(now - 12 * D), by: 'Alex', pallets: 1,
        kinds: ['Broken pallet'], what: 'Bottom boards broken, moved boxes to a new pallet.', photos: [],
        fixLines: [{ label: 'New pallet and restack', qty: 1, rate: 25 }], status: 'approved', decidedAt: iso(now - 12 * D + 40 * MIN), decidedBy: 'Dana Ortiz', example: ex }
    };
    var gear = {
      g_ex1: { customerId: 'c_sierra', truckId: 't_ex7', type: 'plywood', qty: 6, dir: 'out', tags: [], at: iso(now - D - H), by: 'Alex', note: 'Secured load PU-55077', example: ex },
      g_ex2: { customerId: 'c_sierra', truckId: 't_ex7', type: 'bars', qty: 2, dir: 'out', tags: ['B-104', 'B-117'], at: iso(now - D - H), by: 'Alex', note: 'Secured load PU-55077', example: ex },
      g_ex3: { customerId: 'c_sierra', truckId: null, type: 'plywood', qty: 10, dir: 'out', tags: [], at: iso(now - 9 * D), by: 'Jordan', note: '', example: ex },
      g_ex4: { customerId: 'c_sierra', truckId: null, type: 'plywood', qty: 4, dir: 'back', tags: [], at: iso(now - 6 * D), by: 'Office', note: 'Returned by driver', example: ex }
    };
    var settings = {
      main: { promise: 'Unloaded within 2 hours of check-in', waitGoalMin: 30, crew: ['Alex', 'Jordan', 'Sam'], phone: '916-616-3481',
        docks: {
          reno: { name: 'Sparks, NV', doors: 8, address: '1095 Spice Islands Dr, Suites 105-106, Sparks, NV 89431' },
          sac: { name: 'North Highlands, CA', doors: 8, address: '3036 Orange Grove Ave, North Highlands, CA 95660' },
          pa: { name: 'Middletown, PA', doors: 50, address: '2811 Turnpike Industrial Dr, Middletown, PA 17057' }
        },
        hours: 'Docks open 6 AM to 10 PM Monday to Friday. Weekends by appointment.',
        rates: { rewrap: 15, labor: 120, delivery: 300, afterHours: 100, newPallet: 25 },
        example: ex }
    };
    var outbox = {
      msg_ex1: { customerId: 'c_bay', truckId: 't_ex5', event: 'damage', text: 'Damage found on BOL-77790: 2 pallets, torn wrap. Photos and fix price are in your portal. Approve or decline there.',
        to: [{ name: 'Priya Shah', phone: '510-555-0144', email: 'ops@example.net', channels: ['text', 'email'] }], at: iso(now - 3.1 * H), example: ex },
      msg_ex2: { customerId: 'c_bay', truckId: 't_ex2', event: 'arrived', text: 'Your truck 42 (BOL-77812) checked in at Sparks, NV. Place in line: 1.',
        to: [{ name: 'Priya Shah', phone: '510-555-0144', email: '', channels: ['text'] }], at: iso(now - 22 * MIN), example: ex }
    };
    return { customers: customers, trucks: trucks, damage: damage, gear: gear, settings: settings, outbox: outbox, photos: photos };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = makeSeed;
  else root.makeSeed = makeSeed;
})(this);
