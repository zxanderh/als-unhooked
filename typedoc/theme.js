// @ts-check
import _ from 'lodash';
import * as td from 'typedoc';

export class CustomTheme extends td.DefaultTheme {

	/** @param {td.ProjectReflection} project */
	buildNavigation(project) {
		const navItems = super.buildNavigation(project);

		const exprs = [
			(c) => c.text.includes('default'),
			(c) => c.text === 'modern',
			(c) => c.kind === td.ReflectionKind.Function,
			(c) => c.kind === td.ReflectionKind.Class,
			(c) => c.kind === td.ReflectionKind.Variable,
			(c) => c.kind === td.ReflectionKind.TypeAlias,
			() => true,
		];
		const orderFn = (x) => exprs.findIndex((fn) => fn(x));

		/**
		 * Recursively sort navigation items
		 * @param {td.NavigationElement[]} items
		 */
		function sortNav(items) {
			// do these modifications first as some of them are name changes, which will affect the sort
			items.forEach((item) => {
				if (item.text === '<internal>') {
					item.class = item.class ? `${item.class} tsd-is-protected` : 'tsd-is-protected';
				} else if (item.text === 'util/_common') {
					item.text = 'util';
				} else if (item.text === 'ALSGlobal') {
					item.text = 'ALSGlobal (default)';
				} else if (item.text === 'legacy' && item.kind === td.ReflectionKind.Variable) {
					item.text = 'default';
				}
			});

			// recursively sort
			return _.orderBy(items, [orderFn, 'asc']).map(item => {
				if (item.kind === td.ReflectionKind.Module) {
					if (item.text === 'modern') {
						item.text = 'Modern API';
					}
					if (item.text === 'legacy') {
						item.text = 'Legacy API';
					}
				}
				if (item.children) {
					item.children = sortNav(item.children);
				}
				return item;
			});
		}

		return sortNav(navItems);
	}
}
