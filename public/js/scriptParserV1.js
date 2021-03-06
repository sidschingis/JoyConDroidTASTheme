var KEY_DICT = {
  FRAME: 0,
  KEY_A: 1,
  KEY_B: 2,
  KEY_X: 3,
  KEY_Y: 4,
  KEY_L: 5,
  KEY_R: 6,
  KEY_ZL: 7,
  KEY_ZR: 8,
  KEY_PLUS: 9,
  KEY_MINUS: 10,
  KEY_DLEFT: 11,
  KEY_DUP: 12,
  KEY_DRIGHT: 13,
  KEY_DDOWN: 14,
  LX: 15,
  LY: 16,
  RX: 17,
  RY: 18,
  KEY_HOME: 19
};

// Allows you to go backwards
var KEY_INT_ARRAY = Object.keys(KEY_DICT);

function ParserV1() {}

ParserV1.prototype.setScript = function(script) {
  this.parseScript(script);
}

/**
 * Parses the script string and saves the instructions in memory
 * @param string script
 */
ParserV1.prototype.parseScript = function(script) {
  // Split script into lines
  var lines = script.split("\n");
  // Now parse each line into instructions
  this.instructions = {};
  this.lastFrame = -1;

  var numLines = lines.length;

  var instructionRegex = new RegExp("^\\s*(\\+?\\d+)(?:-(\\d+))?\\s+([^\\s]+)(?:\\s+(-?\\d+);(-?\\d+))?(?:\\s+(-?\\d+);(-?\\d+))?");
  var loopStartRegex = new RegExp("^\\s*(\\d+)\\s*[xX]\\s*{");
  var loopEndRegex = new RegExp("^\\s*}");
  var buffer = {};
  var looping = false;
  var repetitions = 0;
  var start = 0;
  var offset = 0;
  for (var i = 0; i < numLines; i++) {
    var line        = lines[i].toUpperCase();
    var loopMatches = line.match(loopStartRegex);

    if (loopMatches)
    {
      // Start Loop
      repetitions = Number(loopMatches[1]);
      looping = true;
      start  = 0;
      buffer = {};
      continue;
    }

    if (line.match(loopEndRegex))
    {
      // Stop loop
      looping = false;
      // Merge Buffer into instructions
      for (var r=0; r<repetitions; r++)
      {
        for (var key of Object.keys(buffer)) {
          var f                = this.lastFrame + Number(key) + 1;
          this.instructions[f] = buffer[key];
        }
        this.lastFrame = f;
      }
      continue;
    }

    var matches = line.match(instructionRegex);

    // Ignore invalid lines
    if (!matches) {
        continue;
    }

    if (!looping){
      // write directly to instructions if not looping
      buffer = this.instructions;
      start  = this.lastFrame + 1;
    }

    var parseResult = this.parseInstructionLine(matches, start);

    start = parseResult.endFrame;

    for (var f = parseResult.startFrame; f <= parseResult.endFrame; f++) {
      buffer[f] = parseResult.instruction;
    }

    if (!looping)
    {
      this.lastFrame = f;
    }
  }

  log(JSON.stringify(this.instructions, null, "\t"));
}

/**
 * @param array matches
 * @param int start
 * @return Object
 */
ParserV1.prototype.parseInstructionLine = function(matches, start) {
  var frame    = 0;
  var endFrame = 0;

  // Start Frame
  var offsetMode = matches[1][0] == "+";

  if (offsetMode) { // Offset
    frame = start + Number(matches[1]);
  } else {
    frame = Number(matches[1]);
  }

  // End frame
  if (matches[2]) {
    if (offsetMode) { // Offset
      endFrame = frame + Number(matches[2]) - 1;
    } else {
      endFrame = Number(matches[2]  );
    }
  } else {
    endFrame = frame;
  }

  var buttons = matches[3].split(";");
  var numButtons = buttons.length;

  // Ignore invalid buttons
  var validButtons = [];
  for (var j = 0; j < numButtons; j++) {
    var buttonName = buttons[j];
    var ind = KEY_DICT[buttonName] ? KEY_DICT[buttonName] : KEY_DICT["KEY_" + buttonName];

    if (ind) {
      validButtons.push(ind);
    }
  }

  var LX = matches[4] ? this.parseJoystickValue(matches[4]) : 0;
  var LY = matches[5] ? this.parseJoystickValue(matches[5]) : 0;
  var RX = matches[6] ? this.parseJoystickValue(matches[6]) : 0;
  var RY = matches[7] ? this.parseJoystickValue(matches[7]) : 0;

  // Power goes to 100
  var leftJoystickPower = Math.min(Math.abs(Math.hypot(LX, LY)), 100);
  var rightJoystickPower = Math.min(Math.abs(Math.hypot(RX, RY)), 100);
  // Angle is in radians
  var leftJoystickAngle = Math.atan2(LY, LX); // + (Math.PI / 2);
  var rightJoystickAngle = Math.atan2(RY, RX); // + (Math.PI / 2);

  var instruction = {
    buttons: validButtons,
    leftStick: {
      x: LX,
      y: LY,
      power: leftJoystickPower,
      angle: leftJoystickAngle
    },
    rightStick: {
      x: RX,
      y: RY,
      power: rightJoystickPower,
      angle: rightJoystickAngle
    }
  };

  return {
    startFrame: frame,
    endFrame: endFrame,
    instruction: instruction
  };
}

/**
 * Converts the text value to the number value used by the controller
 * @param string rawValue
 */
ParserV1.prototype.parseJoystickValue = function(rawValue) {
  return Number(rawValue / 300);
}

ParserV1.prototype.getLastFrame = function() {
  return this.lastFrame;
}

ParserV1.prototype.getFrame = function(requestedFrame) {
  return this.instructions[requestedFrame];
}
