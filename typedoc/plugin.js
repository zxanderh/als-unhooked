// @ts-check
import * as td from 'typedoc';
const { ReflectionKind, ReflectionGroup, DeclarationReflection } = td;
import orderBy from 'lodash.orderby';
import { JSDOM } from 'jsdom';
import { CustomTheme } from './theme.js';

/**
 * @param {import('typedoc').Application} app
 */
export function load(app) {
	app.renderer.defineTheme('als-unhooked', CustomTheme);

	app.renderer.on('beginPage', (page) => {
		const { model } = page;
		if (!model || !(model instanceof DeclarationReflection) || !model.children) {return;}

		if (model.kind === ReflectionKind.Class && model.groups) {
			const idx = model.groups.findIndex(g => g.title === 'Methods');
			const instanceMethods = model.groups[idx];
			const statics = instanceMethods.children.filter(c => c.flags.isStatic);
			instanceMethods.children = instanceMethods.children.filter(c => !c.flags.isStatic);
			instanceMethods.title = 'Instance Methods';
			const staticMethods = new ReflectionGroup('Static Methods', statics[0]);
			staticMethods.children = statics;
			model.groups.splice(idx, 0, staticMethods);

			const propsIdx = model.groups.findIndex(g => g.title === 'Properties');
			if (propsIdx > -1 && !model.groups[propsIdx].children?.length) {
				model.groups.splice(propsIdx, 1);
			}
		}

		if (model.kind === ReflectionKind.Module) {
			const exprs = [
				(c) => c.name === 'default',
				(c) => c.kind === ReflectionKind.Class,
				(c) => c.kind === ReflectionKind.Function,
				(c) => c.kind === ReflectionKind.Variable,
				(c) => c.kind === ReflectionKind.TypeAlias,
				() => true,
			];
			const orderFn = (x) => exprs.findIndex((fn) => fn(x));
			const tmp = orderBy(model.children, [orderFn, 'asc']);
			model.children = tmp;
		}
	});

	app.converter.on(td.Converter.EVENT_RESOLVE_BEGIN, (/** @type {td.Context}*/ context) => {
		const reflections = Object.values(context.project.reflections);
		const classMap = new Map();

		// First pass: Identify all classes and store references
		for (const reflection of reflections) {
			if (reflection.kind === ReflectionKind.Class) {
				classMap.set(reflection.name, reflection);
			}
		}

		// Second pass: Look for @copydocs tags and copy comments
		for (const reflection of reflections) {
			if (reflection.kind === ReflectionKind.Class && reflection.comment) {
				const match = reflection.comment?.blockTags.find((tag) => tag.tag === '@copydocs');
				if (match) {
					const sourceClassName = match.content?.[0]?.text;
					if (sourceClassName && classMap.has(sourceClassName)) {
						const sourceClass = classMap.get(sourceClassName);
						const targetClass = classMap.get(reflection.name);
						copyMethodComments(sourceClass, targetClass);
					}
				}
			}
		}
	});

	app.renderer.on('endPage', (page) => {
		const { model } = page;
		if (!model || !(model instanceof DeclarationReflection)) {return;}

		const dom = new JSDOM(page.contents);
		const { document } = dom.window;

		const remapped = {
			legacy: 'Legacy API',
			modern: 'Modern API',
			'util/_common': 'util',
		};

		if (model.kind === ReflectionKind.Module) {
			const headers = [...document.getElementsByTagName('h1')];
			for (const h of headers) {
				const name = (h.textContent?.split?.('Module ')?.[1] || '');
				if (name in remapped) {
					h.textContent = remapped[name];
					break;
				}
			}
		}


		const breadCrumb = document.querySelector('.tsd-breadcrumb a');
		if (breadCrumb && (breadCrumb.textContent || '') in remapped) {
			breadCrumb.textContent = remapped[breadCrumb.textContent];
		}

		page.contents = dom.serialize();
	});
}

/**
 * @param {td.DeclarationReflection} sourceClass
 * @param {td.DeclarationReflection} targetClass
 */
function copyMethodComments(sourceClass, targetClass) {
	const sourceMethods = Object.values(sourceClass.children || {}).filter(ref => ref.kind === ReflectionKind.Method);
	const targetMethods = Object.values(targetClass.children || {}).filter(ref => ref.kind === ReflectionKind.Method && ref.flags.isStatic === true);

	for (const targetMethod of targetMethods) {
		const sourceMethod = sourceMethods.find(m => m.name === targetMethod.name);
		if (sourceMethod && sourceMethod.comment) {
			targetMethod.comment = new td.Comment(sourceMethod.comment.summary);
		}
		if (sourceMethod && sourceMethod.signatures?.length === 1 && targetMethod.signatures?.length === 1) {
			const comment = sourceMethod.signatures[0]?.comment;
			if (comment) {
				targetMethod.signatures[0].comment ||= new td.Comment(comment.summary, comment.blockTags, comment.modifierTags);
			}
		}
	}
}
