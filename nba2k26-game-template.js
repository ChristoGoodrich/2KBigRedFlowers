// Static HTML template fragments. Loaded before nba2k26-html-templates.js.
(function(window) {
  'use strict';

  const registry = window.NBA2K26_TEMPLATE_PARTS = window.NBA2K26_TEMPLATE_PARTS || {};

  registry.gameModal = `
<div class="modal-overlay" id="game-modal">
  <div class="modal game-modal-shell" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
    <div class="modal-header">
      <div class="modal-title" id="game-modal-title">Record Game</div>
      <button class="modal-close" type="button" onclick="closeGameModal()" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <div class="ocr-entry">
        <div class="ocr-entry-text">
          <span style="color:var(--orange);">OCR</span><span data-i18n="Screenshot auto-fill: upload, drag, or paste with Ctrl+V"> Screenshot auto-fill: upload, drag, or paste with Ctrl+V</span>
        </div>
        <div class="ocr-actions">
          <label for="ocr-file" class="btn-ghost btn ocr-pick" style="cursor:pointer;margin:0;">Choose Screenshot</label>
          <input type="file" id="ocr-file" accept="image/*" class="hidden">
        </div>
      </div>
      <div class="ocr-apply-status" id="ocr-apply-status" aria-live="polite"></div>
      <div class="postgame-summary">
        <div>
          <div class="postgame-summary-label" data-i18n="Postgame snapshot">Postgame snapshot</div>
          <div class="postgame-summary-main" id="game-outcome-line" data-i18n="Ready to log">Ready to log</div>
          <div class="postgame-summary-sub" id="game-eff-line" data-i18n="Enter the score and box score to preview this game.">Enter the score and box score to preview this game.</div>
        </div>
        <div class="postgame-grade-chip" id="game-grade-chip">B</div>
      </div>
      <div class="game-recorder-tools">
        <button type="button" class="btn-ghost btn" onclick="copyPreviousRoster('all')" data-i18n="Copy Last Roster">Copy Last Roster</button>
        <div class="game-draft-status" id="g-draft-status" role="status" aria-live="polite"></div>
        <button type="button" class="btn-ghost btn hidden" id="g-clear-draft-btn" onclick="clearGameDraft()" data-i18n="Clear Draft">Clear Draft</button>
      </div>
      <div class="game-validation-summary" id="g-validation-summary" role="alert" aria-live="assertive"></div>

      <div class="game-log-tabs" role="tablist" aria-label="Game log sections">
        <button type="button" class="game-log-tab active" data-game-tab="main" data-i18n="Game & Stats">Game &amp; Stats</button>
        <button type="button" class="game-log-tab" data-game-tab="teammates" data-i18n="Teammates">Teammates</button>
        <button type="button" class="game-log-tab" data-game-tab="opponents" data-i18n="Opponents">Opponents</button>
        <button type="button" class="game-log-tab" data-game-tab="media">Media</button>
      </div>

      <div class="postgame-layout">

        <!-- ─── TAB 1: Game Setup + Box Score + Shooting + Review ─────────── -->
        <section class="postgame-panel active" data-game-tab-panel="main">

          <div class="form-section-title" data-i18n="Game Setup">Game Setup</div>
          <div class="form-row" style="margin-bottom:10px;">
            <div class="form-group" style="flex:1;">
              <label data-i18n="Build">Build</label>
              <select id="g-build"></select>
            </div>
          </div>
          <div class="form-row cols-3">
            <div class="form-group">
              <label data-i18n="Mode">Mode</label>
              <select id="g-mode">
                <option value="Rec">Rec</option>
                <option value="Pro-Am">Pro-Am</option>
                <option value="The City" data-i18n="The City">The City</option>
                <option value="Theater" data-i18n="Theater">Theater</option>
                <option value="Proving Ground" data-i18n="Proving Ground">Proving Ground</option>
                <option value="Other" data-i18n="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label data-i18n="Date">Date</label>
              <input type="date" id="g-date">
            </div>
            <div class="form-group">
              <label data-i18n="Result">Result</label>
              <select id="g-result">
                <option value="W" data-i18n="Win (W)">Win (W)</option>
                <option value="L" data-i18n="Loss (L)">Loss (L)</option>
              </select>
            </div>
          </div>
          <div class="form-row cols-3" style="margin-bottom:10px;">
            <div class="form-group">
              <label data-i18n="Venue">Venue</label>
              <select id="g-venue">
                <option value="home" data-i18n="Home">Home</option>
                <option value="away" data-i18n="Away">Away</option>
              </select>
            </div>
            <div class="form-group">
              <label data-i18n="Score For">Score For</label>
              <input type="number" min="0" id="g-score-own" placeholder="0" value="0">
            </div>
            <div class="form-group">
              <label data-i18n="Score Against">Score Against</label>
              <input type="number" min="0" id="g-score-opp" placeholder="0" value="0">
            </div>
          </div>
          <div class="form-row" style="gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:0;">
            <div class="form-group" style="max-width:110px;">
              <label data-i18n="My Position">My Position</label>
              <select id="g-myposition">
                <option value="">--</option>
                <option value="PG">PG</option>
                <option value="SG">SG</option>
                <option value="SF">SF</option>
                <option value="PF">PF</option>
                <option value="C">C</option>
              </select>
            </div>
            <div class="form-group" style="max-width:140px;">
              <label data-i18n="Day #">Day # <span class="form-label-hint" data-i18n="Game sequence within the same day (1 = first game of the day)">seq</span></label>
              <input type="number" min="1" max="99" id="g-dayseq" value="1" style="max-width:100px;">
            </div>
          </div>

          <div class="form-section-title" style="margin-top:18px;" data-i18n="Box Score">Box Score</div>
          <div class="stat-grid">
            <div class="form-group"><label>PTS</label><input type="number" min="0" id="g-pts" value="0"></div>
            <div class="form-group"><label>REB</label><input type="number" min="0" id="g-reb" value="0"></div>
            <div class="form-group"><label>AST</label><input type="number" min="0" id="g-ast" value="0"></div>
            <div class="form-group"><label>STL</label><input type="number" min="0" id="g-stl" value="0"></div>
            <div class="form-group"><label>BLK</label><input type="number" min="0" id="g-blk" value="0"></div>
            <div class="form-group"><label>FLS</label><input type="number" min="0" id="g-pf" value="0"></div>
            <div class="form-group"><label>TO</label><input type="number" min="0" id="g-to" value="0"></div>
            <div class="form-group"><label>+/- <span class="auto-field-tag" data-i18n="Auto">Auto</span></label><input type="number" id="g-pm" value="0" readonly tabindex="-1"></div>
          </div>

          <div class="form-section-title" style="margin-top:18px;" data-i18n="Shooting">Shooting</div>
          <div class="shot-grid">
            <div class="form-group"><label data-i18n="FG Made / Att">FG Made / Att</label>
              <div class="paired-inputs"><input type="number" min="0" id="g-fg2m" placeholder="Made" value="0"><input type="number" min="0" id="g-fg2a" placeholder="Att" value="0"></div>
            </div>
            <div class="form-group"><label data-i18n="3PT Made / Att">3PT Made / Att</label>
              <div class="paired-inputs"><input type="number" min="0" id="g-fg3m" placeholder="Made" value="0"><input type="number" min="0" id="g-fg3a" placeholder="Att" value="0"></div>
            </div>
            <div class="form-group"><label data-i18n="FT Made / Att">FT Made / Att</label>
              <div class="paired-inputs"><input type="number" min="0" id="g-ftm" placeholder="Made" value="0"><input type="number" min="0" id="g-fta" placeholder="Att" value="0"></div>
            </div>
          </div>
          <div class="fg-pct-readout" id="game-pct-line"></div>

          <div class="form-section-title" style="margin-top:18px;" data-i18n="Review">Review</div>
          <div class="form-row" style="gap:16px;align-items:flex-start;flex-wrap:wrap;">
            <div class="form-group" style="max-width:150px;">
              <label data-i18n="Player Grade">Player Grade</label>
              <select id="g-grade">
                <option>A+</option><option>A</option><option>A-</option>
                <option>B+</option><option selected>B</option><option>B-</option>
                <option>C+</option><option>C</option><option>C-</option>
                <option>D+</option><option>D</option><option>D-</option>
                <option>F</option>
              </select>
            </div>
            <div class="form-group postgame-notes" style="flex:1;min-width:180px;">
              <label data-i18n="Game Notes">Game Notes</label>
              <textarea id="g-notes" rows="3" data-i18n-placeholder="Performance, matchup, adjustments, and quick notes..." placeholder="Performance, matchup, adjustments, and quick notes..."></textarea>
            </div>
          </div>

        </section>

        <!-- ─── TAB 2: Teammates ──────────────────────────────────────────── -->
        <section class="postgame-panel postgame-roster-panel" data-game-tab-panel="teammates">
          <div class="form-section-title" data-i18n="Teammates">Teammates</div>
          <div class="roster-toolbar">
            <div class="roster-hint" data-i18n="Quick mode only needs names. Expand detailed stats when you want the full box score.">Quick mode only needs names. Expand detailed stats when you want the full box score.</div>
          </div>
          <div class="roster-toolbar">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-ghost btn" id="g-teammates-detail-toggle" onclick="toggleRosterDetail('teammates')" aria-pressed="false" data-i18n="Detailed stats">Detailed stats</button>
              <button type="button" class="btn-ghost btn" onclick="addRosterRow('teammates')" data-i18n="Add Teammate">Add Teammate</button>
              <button type="button" class="btn-ghost btn" onclick="copyPreviousRoster('teammates')" data-i18n="Copy Last Teammates">Copy Last Teammates</button>
              <button type="button" class="btn-ghost btn" onclick="swapRosterSides()" title="Swap all teammates and opponents (fix OCR reversing the two sides)" data-i18n="Swap sides">Swap sides</button>
            </div>
          </div>
          <div class="roster-entry-table roster-compact" id="g-teammates-table">
            <div class="roster-entry-head">
              <span>Player</span><span class="roster-pos-head" data-i18n="Pos">Pos</span><span class="roster-dc-head" data-i18n="DC">DC</span><span class="roster-ai-head" data-i18n="AI">AI</span><span>PTS</span><span>REB</span><span>AST</span><span>STL</span><span>BLK</span><span>FLS</span><span>TO</span><span>FGM</span><span>FGA</span><span>3PM</span><span>3PA</span><span>FTM</span><span>FTA</span><span>+/-</span><span class="roster-grade-head">Grade</span><span></span>
            </div>
            <div id="g-teammates-rows"></div>
          </div>
        </section>

        <!-- ─── TAB 3: Opponents ──────────────────────────────────────────── -->
        <section class="postgame-panel postgame-roster-panel" data-game-tab-panel="opponents">
          <div class="form-section-title" data-i18n="Opponents">Opponents</div>
          <div class="roster-toolbar">
            <div class="roster-hint" data-i18n="Quick mode is enough for matchup history. Detailed stats unlock production reads.">Quick mode is enough for matchup history. Detailed stats unlock production reads.</div>
          </div>
          <div class="roster-toolbar">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-ghost btn" id="g-opponents-detail-toggle" onclick="toggleRosterDetail('opponents')" aria-pressed="false" data-i18n="Detailed stats">Detailed stats</button>
              <button type="button" class="btn-ghost btn" onclick="addRosterRow('opponents')" data-i18n="Add Opponent">Add Opponent</button>
              <button type="button" class="btn-ghost btn" onclick="copyPreviousRoster('opponents')" data-i18n="Copy Last Opponents">Copy Last Opponents</button>
              <button type="button" class="btn-ghost btn" onclick="swapRosterSides()" title="Swap all teammates and opponents (fix OCR reversing the two sides)" data-i18n="Swap sides">Swap sides</button>
            </div>
          </div>
          <div class="roster-entry-table roster-compact" id="g-opponents-table">
            <div class="roster-entry-head">
              <span>Player</span><span class="roster-pos-head" data-i18n="Pos">Pos</span><span class="roster-dc-head" data-i18n="DC">DC</span><span class="roster-ai-head" data-i18n="AI">AI</span><span>PTS</span><span>REB</span><span>AST</span><span>STL</span><span>BLK</span><span>FLS</span><span>TO</span><span>FGM</span><span>FGA</span><span>3PM</span><span>3PA</span><span>FTM</span><span>FTA</span><span>+/-</span><span class="roster-grade-head">Grade</span><span></span>
            </div>
            <div id="g-opponents-rows"></div>
          </div>
        </section>

        <!-- ─── TAB 4: Media ──────────────────────────────────────────────── -->
        <section class="postgame-panel" data-game-tab-panel="media">
          <div class="form-section-title" data-i18n="Screenshots & Highlights">Screenshots &amp; Highlights</div>
          <div class="media-drop-zone" id="g-media-drop">
            <div class="media-drop-icon">+</div>
            <div class="media-drop-text" data-i18n="Click, drag, or paste Ctrl+V to attach a screenshot">Click, drag, or paste <kbd>Ctrl+V</kbd> to attach a screenshot</div>
            <input type="file" id="g-media-file" accept="image/*" multiple class="hidden">
          </div>
          <div class="media-thumb-grid" id="g-media-grid"></div>
        </section>

      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost btn hidden btn-danger" id="g-delete-btn" onclick="deleteGame()" data-i18n="Delete Record">Delete Record</button>
      <div class="game-step-controls">
        <button class="btn-ghost btn" id="g-prev-step" onclick="prevGameStep()" type="button" data-i18n="Previous">Previous</button>
        <div class="game-step-label" id="g-step-label">1/4 <span data-i18n="Game & Stats">Game &amp; Stats</span></div>
        <button class="btn-ghost btn" id="g-next-step" onclick="nextGameStep()" type="button" data-i18n="Next">Next</button>
      </div>
      <div class="modal-footer-right" style="margin-left:auto;">
        <button class="btn-ghost btn" onclick="closeGameModal()" data-i18n="Cancel">Cancel</button>
        <button class="btn" onclick="saveGame()" data-i18n="Save">Save</button>
      </div>
    </div>
  </div>
</div>`.trim();

  registry.gameDetailModal = `
<div class="modal-overlay" id="game-detail-modal">
  <div class="modal game-detail-shell" role="dialog" aria-modal="true" aria-labelledby="game-detail-title">
    <div class="modal-header">
      <div class="modal-title" id="game-detail-title" data-i18n="Game Detail">Game Detail</div>
      <button class="modal-close" type="button" onclick="closeGameDetail()" aria-label="Close">×</button>
    </div>
    <div class="modal-body" id="game-detail-body"></div>
    <div class="modal-footer game-detail-footer">
      <button class="btn-ghost btn gd-footer-spacer" type="button" onclick="shareGameFromDetail()" data-i18n="Share Game">Share Game</button>
      <button class="btn-ghost btn" type="button" onclick="closeGameDetail()" data-i18n="Close">Close</button>
      <button class="btn" type="button" onclick="editGameFromDetail()" data-i18n="Edit">Edit</button>
    </div>
  </div>
</div>`.trim();
})(window);
