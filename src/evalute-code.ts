class CodeContext {
    static isValidConfigValue(value: string): boolean {
        return Object.values(
            CodeContext.CONFIG as Record<string, string>
        ).includes(value);
    }

    static readonly CONFIG = {
        DECIMAL: "dec",
        HEXADECIMAL: "hex",
        BINARY: "bin",
    } as const;

    private _config: string | null = null;

    private _variables = new Map<string, number>();

    setConfig(value: string): void {
        this._config = value;
    }

    getConfig(): string | null {
        return this._config;
    }

    setVariable(name: string, value: number): void {
        this._variables.set(name, value);
    }

    getVariable(name: string): number | null {
        return this._variables.get(name) ?? null;
    }
}

export const Printable = (() => {
    let logs: string[][] = [];
    return {
        log(...arguments_: string[]) {
            logs.push(arguments_);
        },
        getLogs(): string[][] {
            return logs;
        },
        clear() {
            logs = []
        }
    };
})();

class EvaluteCodeLine {
    private static readonly _ETX = "\u0003";

    private static _tokenize(sourceCode: string): string[] {
        return sourceCode.split(/\s+/).filter((token) => token !== "");
    }

    private static _isInt(token: string): boolean {
        return /^-?[0-9]+$/.test(token);
    }

    private static _isVariable(token: string): boolean {
        return /^[a-zA-Z][a-zA-Z0-9]*$/.test(token);
    }

    private readonly _tokens: string[];

    private _position: number = 0;

    private _context: CodeContext;

    constructor(codeLine: string, context: CodeContext) {
        this._tokens = EvaluteCodeLine._tokenize(codeLine);
        this._context = context;
    }

    private _peek(steps: number = 0): string {
        const index = this._position + steps;
        if (index >= this._tokens.length) {
            return EvaluteCodeLine._ETX;
        }
        return this._tokens[index];
    }

    private _consume(token: string): void {
        const nextToken = this._peek();
        if (nextToken == EvaluteCodeLine._ETX) {
            throw new Error("Consumed past last token\n");
        }
        if (nextToken != token) {
            throw new Error(`Could not consume token ${token}\n`);
        }
        this._position++;
    }

    private _parsePrimaryExpression(): number {
        let value: number;
        const nextToken = this._peek();
        if (EvaluteCodeLine._isInt(nextToken)) {
            this._consume(nextToken);
            value = Number(nextToken);
        } else if (EvaluteCodeLine._isVariable(nextToken)) {
            const variableValue = this._context.getVariable(nextToken);
            this._consume(nextToken);
            if (!variableValue) {
                throw new Error(`Variable is undeclared: ${nextToken}\n`);
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

    private _parseProductExpression(): number {
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

    private _parseSumExpression(): number {
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

    private _parseMathExpression(): number {
        return this._parseSumExpression();
    }

    private _makePrintable(value: number): string {
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
            throw new Error(`Config value is not supported: ${configValue}\n`);
        }
    }

    private _parsePrintStatement(): void {
        const nextToken = this._peek();
        if (nextToken === "print") {
            this._consume("print");
            const value = this._parseMathExpression();
            const printableValue = this._makePrintable(value);
            console.log(printableValue);
            Printable.log(printableValue);
        }
    }

    private _parseConfigStatement(): void {
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

    private _parseAssignmentStatement(): void {
        const nextToken = this._peek();
        const nextNextToken = this._peek(1);
        if (EvaluteCodeLine._isVariable(nextToken) && nextNextToken === "=") {
            this._consume(nextToken);
            this._consume(nextNextToken);
            const value = this._parseMathExpression();
            this._context.setVariable(nextToken, value);
        }
    }

    private _parseStatement(): void {
        this._parseConfigStatement();
        this._parseAssignmentStatement();
        this._parsePrintStatement();
    }

    run() {
        this._parseStatement();
    }
}

export class EvaluteCode {
    private static _toCodeLines(code: string): string[] {
        return code.split("\n").filter((line) => line !== "");
    }

    private _context = new CodeContext();

    private _codeLines: string[];

    constructor(code: string) {
        this._codeLines = EvaluteCode._toCodeLines(code);
    }

    run() {
        for (const line of this._codeLines) {
            const evaluteCodeLine = new EvaluteCodeLine(line, this._context);
            evaluteCodeLine.run();
        }
    }
}
