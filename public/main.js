"use strict";
(() => {
  // src/evalute-code.ts
  var CodeContext = class _CodeContext {
    constructor() {
      this._config = null;
      this._variables = /* @__PURE__ */ new Map();
    }
    static isValidConfigValue(value) {
      return Object.values(
        _CodeContext.CONFIG
      ).includes(value);
    }
    static {
      this.CONFIG = {
        DECIMAL: "dec",
        HEXADECIMAL: "hex",
        BINARY: "bin"
      };
    }
    setConfig(value) {
      this._config = value;
    }
    getConfig() {
      return this._config;
    }
    setVariable(name, value) {
      this._variables.set(name, value);
    }
    getVariable(name) {
      return this._variables.get(name) ?? null;
    }
  };
  var Printable = (() => {
    let logs = [];
    return {
      log(...arguments_) {
        logs.push(arguments_);
      },
      getLogs() {
        return logs;
      },
      clear() {
        logs = [];
      }
    };
  })();
  var EvaluteCodeLine = class _EvaluteCodeLine {
    constructor(codeLine, context) {
      this._position = 0;
      this._tokens = _EvaluteCodeLine._tokenize(codeLine);
      this._context = context;
    }
    static {
      this._ETX = "";
    }
    static _tokenize(sourceCode) {
      return sourceCode.split(/\s+/).filter((token) => token !== "");
    }
    static _isInt(token) {
      return /^-?[0-9]+$/.test(token);
    }
    static _isVariable(token) {
      return /^[a-zA-Z][a-zA-Z0-9]*$/.test(token);
    }
    _peek(steps = 0) {
      const index = this._position + steps;
      if (index >= this._tokens.length) {
        return _EvaluteCodeLine._ETX;
      }
      return this._tokens[index];
    }
    _consume(token) {
      const nextToken = this._peek();
      if (nextToken == _EvaluteCodeLine._ETX) {
        throw new Error("Consumed past last token\n");
      }
      if (nextToken != token) {
        throw new Error(`Could not consume token ${token}
`);
      }
      this._position++;
    }
    _parsePrimaryExpression() {
      let value;
      const nextToken = this._peek();
      if (_EvaluteCodeLine._isInt(nextToken)) {
        this._consume(nextToken);
        value = Number(nextToken);
      } else if (_EvaluteCodeLine._isVariable(nextToken)) {
        const variableValue = this._context.getVariable(nextToken);
        this._consume(nextToken);
        if (!variableValue) {
          throw new Error(`Variable is undeclared: ${nextToken}
`);
        }
        value = variableValue;
      } else if (nextToken === "(") {
        this._consume("(");
        value = this._parseMathExpression();
        if (this._peek() == ")") {
          this._consume(")");
        } else {
          throw new Error("Expected: )\n");
        }
      } else {
        throw new Error("Expected: int or ( )\n");
      }
      return value;
    }
    _parseProductExpression() {
      let result = this._parsePrimaryExpression();
      let nextToken = this._peek();
      while (true) {
        if (nextToken === "*") {
          this._consume("*");
          result = result * this._parsePrimaryExpression();
        } else if (nextToken === "/") {
          this._consume("/");
          result = result / this._parsePrimaryExpression();
        } else {
          break;
        }
        nextToken = this._peek();
      }
      return result;
    }
    _parseSumExpression() {
      let result = this._parseProductExpression();
      let nextToken = this._peek();
      while (true) {
        if (nextToken === "+") {
          this._consume("+");
          result = result + this._parseProductExpression();
        } else if (nextToken === "-") {
          this._consume("-");
          result = result - this._parseProductExpression();
        } else {
          break;
        }
        nextToken = this._peek();
      }
      return result;
    }
    _parseMathExpression() {
      return this._parseSumExpression();
    }
    _makePrintable(value) {
      const configValue = this._context.getConfig();
      if (configValue === null) {
        throw new Error("Config must be defined");
      } else if (configValue === CodeContext.CONFIG.DECIMAL) {
        return value.toString();
      } else if (configValue === CodeContext.CONFIG.BINARY) {
        return value.toString(2);
      } else if (configValue === CodeContext.CONFIG.HEXADECIMAL) {
        return value.toString(16);
      } else {
        throw new Error(`Config value is not supported: ${configValue}
`);
      }
    }
    _parsePrintStatement() {
      const nextToken = this._peek();
      if (nextToken === "print") {
        this._consume("print");
        const value = this._parseMathExpression();
        const printableValue = this._makePrintable(value);
        console.log(printableValue);
        Printable.log(printableValue);
      }
    }
    _parseConfigStatement() {
      let nextToken = this._peek();
      if (nextToken === "config") {
        this._consume("config");
        nextToken = this._peek();
        if (CodeContext.isValidConfigValue(nextToken)) {
          this._consume(nextToken);
          this._context.setConfig(nextToken);
        } else {
          throw new Error("Config value invalid must be: hex, dec, bin");
        }
      }
    }
    _parseAssignmentStatement() {
      const nextToken = this._peek();
      const nextNextToken = this._peek(1);
      if (_EvaluteCodeLine._isVariable(nextToken) && nextNextToken === "=") {
        this._consume(nextToken);
        this._consume(nextNextToken);
        const value = this._parseMathExpression();
        this._context.setVariable(nextToken, value);
      }
    }
    _parseStatement() {
      this._parseConfigStatement();
      this._parseAssignmentStatement();
      this._parsePrintStatement();
    }
    run() {
      this._parseStatement();
    }
  };
  var EvaluteCode = class _EvaluteCode {
    constructor(code) {
      this._context = new CodeContext();
      this._codeLines = _EvaluteCode._toCodeLines(code);
    }
    static _toCodeLines(code) {
      return code.split("\n").filter((line) => line !== "");
    }
    run() {
      for (const line of this._codeLines) {
        const evaluteCodeLine = new EvaluteCodeLine(line, this._context);
        evaluteCodeLine.run();
      }
    }
  };

  // src/main.ts
  var textAreaInputElement = document.getElementById(
    "text-area-input"
  );
  if (!textAreaInputElement) {
    throw new Error(`No element with id "text-area-input" was found`);
  }
  var buttonRunElement = document.getElementById(
    "button-run"
  );
  if (!buttonRunElement) {
    throw new Error(`No element with id "button-run" was found`);
  }
  var textAreaOutputElement = document.getElementById(
    "text-area-output"
  );
  if (!textAreaOutputElement) {
    throw new Error(`No element with id "text-area-output" was found`);
  }
  var buttonClearElement = document.getElementById(
    "button-clear"
  );
  if (!buttonClearElement) {
    throw new Error(`No element with id "button-clear" was found`);
  }
  function clearOutput() {
    if (!textAreaOutputElement) {
      return;
    }
    Printable.clear();
    textAreaOutputElement.value = "";
  }
  function runCode() {
    if (!textAreaInputElement) {
      return;
    }
    if (!textAreaOutputElement) {
      return;
    }
    const evaluteCode = new EvaluteCode(textAreaInputElement.value);
    evaluteCode.run();
    const output = Printable.getLogs().map((row) => row.join(" ")).join("\n");
    textAreaOutputElement.value = output;
  }
  buttonRunElement.addEventListener("click", () => {
    clearOutput();
    runCode();
  });
  buttonClearElement.addEventListener("click", clearOutput);
})();
