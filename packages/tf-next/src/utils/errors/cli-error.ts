class CliError<Code> extends Error {
  code: Code;

  constructor({ code, message }: { code: Code; message: string }) {
    super(message);
    this.code = code;
  }
}

export { CliError };
