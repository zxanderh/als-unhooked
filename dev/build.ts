import * as ts from 'typescript';
import * as path from 'node:path';
import * as fs from 'node:fs';

// replaces top-level async import with regular require for cjs
export function transform(): ts.TransformerFactory<ts.SourceFile> {
	const regex = /\(await import\('emitter-listener'\)\)\.default/;
	return (): ts.Transformer<ts.SourceFile> => {
		return (sf: ts.SourceFile) => {
			const fullText = sf.getFullText(sf);
			const res = regex.exec(fullText);
			const replacement = "require('emitter-listener')";
			if (res) {
				return sf.update(fullText.replace(regex, replacement), { span: { start: res?.index, length: res[0].length }, newLength: replacement.length });
			}
			return sf;
		};
	};
}

function reportDiagnostics(diagnostics: ts.Diagnostic[]): void {
	diagnostics.forEach(diagnostic => {
		let message = 'Error';
		if (diagnostic.file) {
			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
			message += ` ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
		}
		const errMsg = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
		if (errMsg.startsWith("Top-level 'await' expressions are only allowed")) {
			// ignore this error because we'll rectify it later
			return;
		}
		message += ': ' + errMsg;
		console.log(message);
	});
}


function compile(): void {
	// Extract configuration from config file and cli args
	const cliOptions = ts.parseCommandLine(process.argv.slice(2));
	const config = ts.getParsedCommandLineOfConfigFile('tsconfig.json', cliOptions.options, ts.sys as any)!;

	// Compile
	const program = ts.createProgram(config.fileNames, config.options);
	let emitResult: ts.EmitResult;
	if (config.options.module === ts.ModuleKind.CommonJS) {
		config.options.outDir = path.join(config.options.outDir || './lib', 'cjs');
		emitResult = program.emit(undefined, undefined, undefined, undefined, { before: [ transform() ] });

		// Write a package.json with type=commonjs
		fs.writeFileSync(path.join(config.options.outDir!, 'package.json'), '{"type": "commonjs"}');
	} else {
		config.options.outDir = path.join(config.options.outDir || './lib', 'esm');
		emitResult = program.emit();
	}

	// Report errors
	reportDiagnostics(ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics));

	// Return code
	const exitCode = emitResult.emitSkipped ? 1 : 0;
	process.exit(exitCode);
}

compile();
