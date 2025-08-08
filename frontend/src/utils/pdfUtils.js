export const downloadLogSheets = async (routeData, setDownloading) => {
  if (!routeData || !routeData.logs) return;

  setDownloading(true);
  try {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    routeData.logs.forEach((logData) => {
      const logSheet = document.createElement('div');
      logSheet.className = 'log-sheet-container';
      logSheet.style.pageBreakAfter = 'always';
      logSheet.style.marginBottom = '20px';

      const logSheetContent = document.createElement('div');
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const year = today.getFullYear();

      // Build status timeline at 15-minute resolution (96 points, 0..95)
      const quarterStatuses = Array(96).fill('Off Duty');
      if (logData.events) {
        logData.events.forEach((event) => {
          const startHours = Number(event.start_time_hours || 0);
          const endHours = startHours + Number(event.duration || 0) / 3600;
          // map to quarter-hour indices using floor/ceil to avoid rounding drift
          const startQ = Math.max(0, Math.floor(startHours * 4 + 1e-6));
          const endQ = Math.min(96, Math.ceil(endHours * 4 - 1e-6));
          for (let q = startQ; q < endQ; q++) quarterStatuses[q] = event.status;
        });
      }

      const totals = { 'Off Duty': 0, 'Sleeper Berth': 0, 'Driving': 0, 'On Duty': 0 };
      quarterStatuses.forEach((s) => {
        if (s === 'Off Duty') totals['Off Duty'] += 0.25;
        else if (s === 'Sleeper Berth') totals['Sleeper Berth'] += 0.25;
        else if (s === 'Driving') totals['Driving'] += 0.25;
        else if (s === 'On Duty') totals['On Duty'] += 0.25;
      });

      // Geometry constants (account for inner padding of container: 15px left/right)
      const OUTER_WIDTH = 1400; // container width to use more page width in landscape
      const PADDING = 15; // must match container padding in template below
      const CONTENT_WIDTH = OUTER_WIDTH - 2 * PADDING; // usable width inside padding
      const LEFT_MARGIN = 70;  // px for status labels column (more room for label wrap)
      const RIGHT_COL_WIDTH = 70; // totals column width
      const COLUMNS_WIDTH = CONTENT_WIDTH - LEFT_MARGIN - RIGHT_COL_WIDTH; // graph width exactly
      const HOUR_WIDTH = COLUMNS_WIDTH / 24;
      const QUARTER_WIDTH = HOUR_WIDTH / 4;
      const GRID_HEIGHT = 140; // rows area height
      const statusYMap = { 'Off Duty': 20, 'Sleeper Berth': 55, 'Driving': 90, 'On Duty': 125 };

      // Build SVG path for blue line
      const pathD = (() => {
        let d = '';
        let x = LEFT_MARGIN;
        let y = statusYMap[quarterStatuses[0]] || statusYMap['Off Duty'];
        d += `M ${x} ${y}`;
        for (let i = 0; i < 96; i++) {
          const currentStatus = quarterStatuses[i];
          const currentY = statusYMap[currentStatus] || statusYMap['Off Duty'];
          const nextX = LEFT_MARGIN + (i + 1) * QUARTER_WIDTH;
          // Horizontal segment for this quarter
          d += ` L ${nextX} ${currentY}`;
          // If status changes at the boundary to next quarter, draw vertical
          if (i < 95) {
            const nextStatus = quarterStatuses[i + 1];
            const nextY = statusYMap[nextStatus] || statusYMap['Off Duty'];
            if (nextY !== currentY) d += ` L ${nextX} ${nextY}`;
          }
        }
        return d;
      })();

      logSheetContent.innerHTML = `
        <div style="font-family: 'Courier New', monospace; width: ${OUTER_WIDTH}px; margin: 0 auto; padding: ${PADDING}px; background: white; border: 2px solid #000;">
          <!-- Header Section -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div style="text-align: left;"><div style="font-size: 14px; font-weight: bold;">A Completed Log</div></div>
            <div style="text-align: center; font-size: 16px; font-weight: bold;">DRIVER'S DAILY LOG<br>(ONE CALENDAR DAY - 24 HOURS)</div>
            <div style="text-align: right; font-size: 10px;">ORIGINAL - Submit to carrier within 13 days<br>DUPLICATE - Driver retains possession for eight days</div>
          </div>

          <!-- Driver and Carrier Information -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
            <div style="border-right: 2px solid #000; padding-right: 20px;">
              <div style="font-size: 12px; margin-bottom: 5px;">U.S. DEPARTMENT OF TRANSPORTATION</div>
              <div style="display: flex; gap: 20px; margin-bottom: 10px;">
                <div><span style="font-size: 12px;">Date:</span> <span style="font-size: 14px; font-weight: bold; margin-left: 5px;">${month}</span> <span style="font-size: 12px; margin-left: 5px;">(MONTH)</span></div>
                <div><span style="font-size: 14px; font-weight: bold;">${day}</span> <span style="font-size: 12px; margin-left: 5px;">(DAY)</span></div>
                <div><span style="font-size: 14px; font-weight: bold;">${year}</span> <span style="font-size: 12px; margin-left: 5px;">(YEAR)</span></div>
              </div>
              <div style="margin-bottom: 10px;"><span style="font-size: 12px;">Total Miles Driving Today:</span> <span style="font-size: 14px; font-weight: bold; margin-left: 5px;">${Math.round(routeData.total_distance_miles || 0)}</span></div>
              <div style="margin-bottom: 10px;"><span style="font-size: 12px;">Name of Carrier or Carriers:</span><div style="font-size: 14px; font-weight: bold; margin-top: 2px;">${routeData.log_info?.carrier_name || 'N/A'}</div></div>
              <div><span style="font-size: 12px;">Main Office Address:</span><div style="font-size: 14px; font-weight: bold; margin-top: 2px;">${routeData.log_info?.carrier_address || 'N/A'}</div></div>
            </div>
            <div>
              <div style="font-size: 12px; margin-bottom: 10px;">I certify that these entries are true and correct</div>
              <div style="margin-bottom: 10px;"><span style="font-size: 12px;">Driver's Signature in Full:</span><div style="font-size: 14px; font-weight: bold; margin-top: 2px; border-bottom: 1px solid #000; min-height: 20px;">${routeData.log_info?.driver_name || 'N/A'}</div></div>
              <div style="margin-bottom: 10px;"><span style="font-size: 12px;">Vehicle Numbers:</span><div style="font-size: 14px; font-weight: bold; margin-top: 2px;">${routeData.log_info?.truck_number || 'N/A'}, ${routeData.log_info?.trailer_number || 'N/A'}</div></div>
              <div><span style="font-size: 12px;">Name of Co-Driver:</span><div style="font-size: 14px; font-weight: bold; margin-top: 2px;">${routeData.log_info?.co_driver || 'N/A'}</div></div>
            </div>
          </div>

          <!-- Main Graph Section -->
          <div style="border: 2px solid #000; margin-bottom: 20px; position: relative;">
            <!-- Time Header -->
            <div style="position: relative; width: ${LEFT_MARGIN + COLUMNS_WIDTH + RIGHT_COL_WIDTH}px; height: 32px; border-bottom: 2px solid #000; background: #f0f0f0;">
              <div style="position:absolute; left:0; top:0; width:${LEFT_MARGIN}px; height:100%; border-right:2px solid #000; display:flex; align-items:center; padding-left:8px; font-size:10px; font-weight:bold;">Duty Status</div>
              ${(() => {
                let html = '';
                for (let h = 0; h < 24; h++) {
                  const label = h === 0 ? 'Midnight' : (h === 12 ? 'Noon' : String(h));
                  const x = LEFT_MARGIN + h * HOUR_WIDTH;
                  html += `<div style=\"position:absolute; left:${x}px; top:6px; width:${HOUR_WIDTH}px; text-align:center; font-size:10px; font-weight:bold;\">${label}</div>`;
                }
                return html;
              })()}
            </div>

            <!-- Rows area -->
            <div style="position: relative; height: ${GRID_HEIGHT}px; width: ${LEFT_MARGIN + COLUMNS_WIDTH + RIGHT_COL_WIDTH}px;">
              ${(() => {
                const pieces = [];
                // Draw 4 rows with per-row tick marks (no full-height grid lines)
                const rowDefs = [
                  { label: 'Off Duty', y: 20 },
                  { label: 'Sleeper Berth', y: 55 },
                  { label: 'Driving', y: 90 },
                  { label: 'On Duty', y: 125 }
                ];
                rowDefs.forEach(({ y }) => {
                  // Base horizontal line
                  pieces.push(`<div style=\"position:absolute;left:${LEFT_MARGIN}px;top:${y}px;width:${COLUMNS_WIDTH}px;height:2px;background:#000;\"></div>`);
                  // Hour and quarter ticks that hang down from the baseline only
                  for (let h = 0; h <= 24; h++) {
                    const xHour = LEFT_MARGIN + h * HOUR_WIDTH;
                    // Hour tick (longer)
                    pieces.push(`<div style=\"position:absolute;left:${xHour}px;top:${y - 16}px;width:1px;height:16px;background:#333;\"></div>`);
                    if (h < 24) {
                      for (let q = 1; q < 4; q++) {
                        const xq = xHour + q * QUARTER_WIDTH;
                        pieces.push(`<div style=\"position:absolute;left:${xq}px;top:${y - 10}px;width:1px;height:10px;background:#777;\"></div>`);
                      }
                    }
                  }
                });
                return pieces.join('');
              })()}

              <!-- Status labels column -->
              <div style="position:absolute; left:0; top:0; width:${LEFT_MARGIN}px; height:100%; border-right:2px solid #000;">
                <div style="position:absolute; top:8px; left:8px; font-size:11px; font-weight:bold;">Off<br/>Duty</div>
                <div style="position:absolute; top:43px; left:8px; font-size:11px; font-weight:bold;">Sleeper<br/>Berth</div>
                <div style="position:absolute; top:78px; left:8px; font-size:11px; font-weight:bold;">Driving</div>
                <div style="position:absolute; top:112px; left:8px; font-size:11px; font-weight:bold;">On Duty<br/>(Not Driving)</div>
              </div>

              <!-- Blue Line SVG -->
              <svg width="${LEFT_MARGIN + COLUMNS_WIDTH}px" height="${GRID_HEIGHT}px" style="position:absolute;left:0;top:0;pointer-events:none;z-index:10;">
                <path d="${pathD}" fill="none" stroke="#0077ff" stroke-width="2" shape-rendering="crispEdges" />
              </svg>

              <!-- Right-edge separator at end of 24h grid -->
              <div style="position:absolute; left:${LEFT_MARGIN + COLUMNS_WIDTH}px; top:0; width:2px; height:${GRID_HEIGHT}px; background:#000;"></div>

              <!-- Right-side totals column anchored to the right edge inside the box -->
              <div style="position:absolute; left:${LEFT_MARGIN + COLUMNS_WIDTH + 2}px; top:0; width:${RIGHT_COL_WIDTH - 2}px;">
                <div style="position:absolute; top:${20 - 8}px; right:0; font-size:18px; font-weight:700;">${Number(totals['Off Duty'].toFixed(2))}</div>
                <div style="position:absolute; top:${55 - 8}px; right:0; font-size:18px; font-weight:700;">${Number(totals['Sleeper Berth'].toFixed(2))}</div>
                <div style="position:absolute; top:${90 - 8}px; right:0; font-size:18px; font-weight:700;">${Number(totals['Driving'].toFixed(2))}</div>
                <div style="position:absolute; top:${125 - 8}px; right:0; font-size:18px; font-weight:700;">${Number(totals['On Duty'].toFixed(2))}</div>
              </div>
            </div>
            
            <!-- Totals Row removed; totals displayed in right-side column to match sample -->
          </div>

          <!-- Bottom Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">REMARKS</div>
              <div style="border: 1px solid #000; min-height: 80px; padding: 10px; font-size: 11px;">${logData.events ? logData.events.map(e => e.description ? `${e.description}<br>` : '').join('') : ''}</div>
            </div>
            <div>
              <div style="font-size: 12px; margin-bottom: 5px;">Pro or Shipping No.:</div>
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 20px;">${Math.floor(Math.random() * 999999) + 100000}</div>
              <div style="font-size: 12px; margin-bottom: 5px;">Total for Day:</div>
              <div style="font-size: 14px; font-weight: bold;">=24</div>
            </div>
          </div>

          <!-- Locations Timeline -->
          <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 10px;">Locations</div>
            <div style="position: relative; height: 40px; border-bottom: 1px solid #000;">
              ${(() => {
                const items = [];
                if (logData.events) {
                  logData.events.forEach((event) => {
                    const x = LEFT_MARGIN + Math.floor(Number(event.start_time_hours || 0) * 4) * QUARTER_WIDTH;
                    const location = event.description?.split(' at ')[1] || event.description?.split(' to ')[1] || 'Location';
                    items.push(`<div style=\"position:absolute;left:${x}px;top:0;transform:translateX(-50%);\"><div style=\"width:2px;height:10px;background:#000;margin:0 auto;\"></div><div style=\"font-size:8px;text-align:center;margin-top:2px;transform:rotate(-45deg);white-space:nowrap;\">${location}</div></div>`);
                  });
                }
                return items.join('');
              })()}
            </div>
          </div>
        </div>
      `;

      logSheet.appendChild(logSheetContent);
      container.appendChild(logSheet);
    });

    const { jsPDF } = await import('jspdf');
    const html2canvas = await import('html2canvas');

    // Landscape PDF to provide more horizontal room for the grid
    const pdf = new jsPDF('l', 'mm', 'a4');
    const logSheets = container.querySelectorAll('.log-sheet-container');
    for (let i = 0; i < logSheets.length; i++) {
      const canvas = await html2canvas.default(logSheets[i], { 
        scale: 3, // Higher scale for better quality
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: logSheets[i].offsetWidth,
        height: logSheets[i].offsetHeight,
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });
      const imgData = canvas.toDataURL('image/png', 1.0); // Maximum quality
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add with full page width and proportional height
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      if (i < logSheets.length - 1) pdf.addPage();
    }

    const fileName = `driver_log_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    document.body.removeChild(container);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF. Please try again.');
  } finally {
    setDownloading(false);
  }
};
