// Static HTML template fragments. Loaded before nba2k26-html-templates.js.
(function(window) {
  'use strict';

  const registry = window.NBA2K26_TEMPLATE_PARTS = window.NBA2K26_TEMPLATE_PARTS || {};

  registry.buildModal = `
<div class="modal-overlay" id="build-modal">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="build-modal-title">
    <div class="modal-header">
      <div class="modal-title" id="build-modal-title">New Build</div>
      <button class="modal-close" type="button" onclick="closeBuildModal()" aria-label="Close">x</button>
    </div>
    <div class="modal-body">
      <div class="build-tabs">
        <button class="build-tab active" data-tab="basics">Basics</button>
        <button class="build-tab" data-tab="attrs">Attributes</button>
        <button class="build-tab" data-tab="badges">Badges</button>
      </div>

      <div class="build-tab-pane active" data-pane="basics">
        <div class="form-section-title">Identity</div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Build Nickname</label>
            <input type="text" id="b-name" placeholder="e.g. Iso Shooter">
          </div>
          <div class="form-group">
            <label>Build Name</label>
            <input type="text" id="b-archetype" placeholder="e.g. Two-Way Shot Creator">
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label>Position</label>
            <select id="b-position"><option>PG</option><option>SG</option><option>SF</option><option>PF</option><option>C</option></select>
          </div>
          <div class="form-group">
            <label>Secondary Position</label>
            <select id="b-position-2"><option value="">-</option><option>PG</option><option>SG</option><option>SF</option><option>PF</option><option>C</option></select>
          </div>
          <div class="form-group">
            <label>Body Type</label>
            <select id="b-body-type">
              <option>Slim</option>
              <option>Athletic</option>
              <option>Built</option>
              <option>Solid</option>
            </select>
          </div>
        </div>
        <div class="form-section-title">Body</div>
        <div class="form-row cols-4">
          <div class="form-group">
            <label>Height</label>
            <input type="text" id="b-height" placeholder="6'6&quot;">
          </div>
          <div class="form-group">
            <label>Weight (lbs)</label>
            <input type="number" id="b-weight" placeholder="200">
          </div>
          <div class="form-group">
            <label>Wingspan</label>
            <input type="text" id="b-wingspan" placeholder="6'10&quot;">
          </div>
          <div class="form-group">
            <label>OVR <button type="button" class="inline-action" onclick="autoCalcOVR()" title="Estimate from attributes">Auto</button></label>
            <input type="number" id="b-ovr" min="60" max="99" value="99">
          </div>
        </div>
        <div class="form-section-title">Takeover / Focus</div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label>Primary Takeover</label>
            <select id="b-takeover-1">
<optgroup label="Finishing">
                <option>Paint Dominance</option><option>Posterizer</option><option>Acrobat</option><option>Float Game</option>
              </optgroup>
              <optgroup label="Shooting">
                <option>Spot-Up Precision</option><option>Limitless Range</option><option>Shot Creator</option><option>Mid-Range Maestro</option>
              </optgroup>
              <optgroup label="Playmaking">
                <option>Dime Dropper</option><option>Ankle Breaker</option><option>Speed Booster</option>
              </optgroup>
              <optgroup label="Defense">
                <option>Lockdown</option><option>Paint Protector</option><option>Interceptor</option>
              </optgroup>
              <optgroup label="Rebounding">
                <option>Glass Cleaner</option><option>Board Beast</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>Secondary Takeover</label>
            <select id="b-takeover-2">
<optgroup label="Finishing">
                <option>Paint Dominance</option><option>Posterizer</option><option>Acrobat</option><option>Float Game</option>
              </optgroup>
              <optgroup label="Shooting">
                <option>Spot-Up Precision</option><option>Limitless Range</option><option>Shot Creator</option><option>Mid-Range Maestro</option>
              </optgroup>
              <optgroup label="Playmaking">
                <option>Dime Dropper</option><option>Ankle Breaker</option><option>Speed Booster</option>
              </optgroup>
              <optgroup label="Defense">
                <option>Lockdown</option><option>Paint Protector</option><option>Interceptor</option>
              </optgroup>
              <optgroup label="Rebounding">
                <option>Glass Cleaner</option><option>Board Beast</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>Build Focus</label>
            <select id="b-specialization">
              <option>Finishing</option>
              <option>Shooting</option>
              <option>Playmaking</option>
              <option>Defense</option>
              <option>Rebounding</option>
              <option>Balanced</option>
            </select>
          </div>
        </div>
      </div>

      <div class="build-tab-pane" data-pane="attrs">
        <div class="form-hint">// Attribute range 25-99. Caps update from position, height, and weight.</div>
        <div class="attr-grid">
          <div class="attr-section">
            <div class="attr-section-head">
              <div class="attr-section-sub">Finishing</div>
              <div class="attr-section-avg" id="attr-avg-fin">--</div>
            </div>
            <div class="attr-row" data-attr="closeShot"><label>Close Shot</label><input type="number" min="25" max="99" class="attr-input" data-group="fin"></div>
            <div class="attr-row" data-attr="drivingLayup"><label>Driving Layup</label><input type="number" min="25" max="99" class="attr-input" data-group="fin"></div>
            <div class="attr-row" data-attr="drivingDunk"><label>Driving Dunk</label><input type="number" min="25" max="99" class="attr-input" data-group="fin"></div>
            <div class="attr-row" data-attr="standingDunk"><label>Standing Dunk</label><input type="number" min="25" max="99" class="attr-input" data-group="fin"></div>
            <div class="attr-row" data-attr="postControl"><label>Post Control</label><input type="number" min="25" max="99" class="attr-input" data-group="fin"></div>
          </div>
          <div class="attr-section">
            <div class="attr-section-head">
              <div class="attr-section-sub">Shooting</div>
              <div class="attr-section-avg" id="attr-avg-sho">--</div>
            </div>
            <div class="attr-row" data-attr="midRange"><label>Mid-Range</label><input type="number" min="25" max="99" class="attr-input" data-group="sho"></div>
            <div class="attr-row" data-attr="threePoint"><label>Three-Point</label><input type="number" min="25" max="99" class="attr-input" data-group="sho"></div>
            <div class="attr-row" data-attr="freeThrow"><label>Free Throw</label><input type="number" min="25" max="99" class="attr-input" data-group="sho"></div>
          </div>
          <div class="attr-section">
            <div class="attr-section-head">
              <div class="attr-section-sub">Playmaking</div>
              <div class="attr-section-avg" id="attr-avg-pla">--</div>
            </div>
            <div class="attr-row" data-attr="passAccuracy"><label>Pass Accuracy</label><input type="number" min="25" max="99" class="attr-input" data-group="pla"></div>
            <div class="attr-row" data-attr="ballHandle"><label>Ball Handle</label><input type="number" min="25" max="99" class="attr-input" data-group="pla"></div>
            <div class="attr-row" data-attr="speedWithBall"><label>Speed With Ball</label><input type="number" min="25" max="99" class="attr-input" data-group="pla"></div>
          </div>
          <div class="attr-section">
            <div class="attr-section-head">
              <div class="attr-section-sub">Defense</div>
              <div class="attr-section-avg" id="attr-avg-def">--</div>
            </div>
            <div class="attr-row" data-attr="interiorDefense"><label>Interior Defense</label><input type="number" min="25" max="99" class="attr-input" data-group="def"></div>
            <div class="attr-row" data-attr="perimeterDefense"><label>Perimeter Defense</label><input type="number" min="25" max="99" class="attr-input" data-group="def"></div>
            <div class="attr-row" data-attr="steal"><label>Steal</label><input type="number" min="25" max="99" class="attr-input" data-group="def"></div>
            <div class="attr-row" data-attr="block"><label>Block</label><input type="number" min="25" max="99" class="attr-input" data-group="def"></div>
          </div>
          <div class="attr-section">
            <div class="attr-section-head">
              <div class="attr-section-sub">Rebounding</div>
              <div class="attr-section-avg" id="attr-avg-reb">--</div>
            </div>
            <div class="attr-row" data-attr="offensiveRebound"><label>Offensive Rebound</label><input type="number" min="25" max="99" class="attr-input" data-group="reb"></div>
            <div class="attr-row" data-attr="defensiveRebound"><label>Defensive Rebound</label><input type="number" min="25" max="99" class="attr-input" data-group="reb"></div>
          </div>
          <div class="attr-section">
            <div class="attr-section-head">
              <div class="attr-section-sub">Physicals</div>
              <div class="attr-section-avg" id="attr-avg-phy">--</div>
            </div>
            <div class="attr-row" data-attr="speed"><label>Speed</label><input type="number" min="25" max="99" class="attr-input" data-group="phy"></div>
            <div class="attr-row" data-attr="agility"><label>Agility</label><input type="number" min="25" max="99" class="attr-input" data-group="phy"></div>
            <div class="attr-row" data-attr="strength"><label>Strength</label><input type="number" min="25" max="99" class="attr-input" data-group="phy"></div>
            <div class="attr-row" data-attr="vertical"><label>Vertical</label><input type="number" min="25" max="99" class="attr-input" data-group="phy"></div>
          </div>
        </div>
      </div>

      <div class="build-tab-pane" data-pane="badges">
        <div class="form-hint">// Choose badge tiers. Default is None. Use x to clear a selected tier.</div>
        <div id="badge-summary" class="badge-summary"></div>
        <div id="badge-list-container"></div>

        <div class="form-section-title" style="margin-top:24px;">Jumpshot / Notes</div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Jumpshot Base</label>
            <input type="text" id="b-jumpshot-base" placeholder="e.g. Cam Thomas">
          </div>
          <div class="form-group">
            <label>Jumpshot Release</label>
            <input type="text" id="b-jumpshot-release" placeholder="e.g. Oscar Robertson">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Playstyle Notes</label>
            <textarea id="b-notes" rows="3" placeholder="Role, strengths, matchup notes, and main use cases..."></textarea>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost btn hidden btn-danger" id="b-delete-btn" onclick="deleteBuild()">Delete Build</button>
      <div class="modal-footer-right" style="margin-left:auto;">
        <button class="btn-ghost btn" onclick="closeBuildModal()">Cancel</button>
        <button class="btn" onclick="saveBuild()">Save</button>
      </div>
    </div>
  </div>
</div>`.trim();
})(window);
