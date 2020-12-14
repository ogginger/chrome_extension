/**
 * Ashe.js is a smart, fast, eval-less javascript templating library.
 */
let uid:any, tokens:any,

process = function(str:any, data:any) {
	return str.replace(/\{_(\d+?)\}/g, function(a:any, b:any) {
		let token = tokens[b], repl, i;
		if (!token.expr) {
			repl = evl(data, tokens[b].buffer);
			if (token.modif.length) {
				for (i in token.modif) {
					let modif = token.modif[i],
						params = [],
						check = token.modif[i].match(/(\w+)\(([\s\S]+)\)/);

					if (check) {
						modif  = check[1];
						params = check[2].split(/\s*,\s*/);
					}
					params.unshift(repl);
					modif = Ashe.modifiers[modif] || window[modif];

					if (typeof modif != 'function') {
						throw new Error('Ashe: Unknown modifier "' + token.modif[i] + '".');
					}

					repl = modif.apply(this, params);
				}
			}
			return repl;
		}
		else {
			let block;
			switch (token.expr.type) {
				case 'if':
					let cond = evl(data, token.expr.cond);
					block = token.buffer.match(cond
						? /\{%\s*if\s+.+?\s*%\}([\s\S]*?)\{%/i
						: /\{%\s*else\s*%\}([\s\S]*?)\{%/i
					);
					return block ? process(block[1], data) : '';

				case 'for':
					let loopData = evl(data, token.expr.list);
					if (typeof loopData == 'undefined') {
						if (Ashe.debug) {
							throw new Error('Ashe: Undefined list "' + token.expr.list + '".');
						}
						return '';
					}

					if (hasElements(loopData)) {
						block = token.buffer.match(/\{%\s*for.*?\s*%\}([\s\S]*?)\{%/i);
						if (block) {
							let key, k,
								elem = token.expr.elem,
								split = elem.split(/\s*,\s*/),
								subStr = '';

							if (split.length == 2) {
								key = split[0];
								elem = split[1];
							}

							for (k in loopData) {
								if (loopData.hasOwnProperty(k)) {
									let tmpObj:any = {};
									if (key) tmpObj[key] = k;
									tmpObj[elem] = loopData[k];
									subStr += process(block[1], tmpObj);
								}
							}
							return subStr;
						}
						return '';
					}
					else {
						block = token.buffer.match(/\{%\s*else\s*%\}([\s\S]*?)\{%/i);
						return block ? process(block[1], loopData) : '';
					}

				case 'set':
					let t = token.expr,
						v = t.sval ? evl(data, t.sval) : process(token.buffer.replace(/\{%.*?%\}/g , ''), data);
					data[t.svar] = v;
					return '';
			}
		}
	});
},

/**
 * Replace just markers between {{ and }}.
 */
proccessMarkers = function(str:any) {
	let i = 0;
	str = trim(str);

	while ((i = str.indexOf('{{', i)) != -1) {
		let id = uid++,
			end = str.indexOf('}}', i),
			buffer = trim(str.slice(i+2, end)).split('|'),
			repl = '{_' + id + '}';

		tokens[id] = {
			buffer: buffer.shift(),
			modif: buffer
		};

		str = replaceWith(str, repl, i, end+2);
		i = i + repl.length;
	}

	return str;
},

/**
 * Replace control blocks, loops, conditions.
 */
proccessControls = function(str:any, i:any, lookingFor?:any, exprDescr?:any, inline?:any) {
	let from = i;

	while ((i = str.indexOf('{%', i)) != -1) {
		let id = uid++,
			end = str.indexOf('%}', i),
			expr = str.slice(i+2, end),
			repl = '{_' + id + '}';

		if (inline || (lookingFor && expr.match(lookingFor))) {
			let start = from - 2;
			end = i + expr.length + 4;

			tokens[id] = {
				buffer: trim(str.slice(start, end)),
				expr: exprDescr
			};

			return replaceWith(str, repl, start, end);
		}
		else {
			let m;
			// For loop
			if (m = expr.match(/\s*for\s+((?:\w+\s*,)?\s*\w+)\s+in\s+(.+?)\s*$/i)) {
				str = proccessControls(str, i+2, /\s*endfor\s*/i, {
					type: 'for',
					elem: m[1],
					list: m[2]
				});
			}
			// If statement
			else if (m = expr.match(/\s*if\s+(.+)\s*/i)) {
				str = proccessControls(str, i+2, /\s*endif\s*/i, {
					type: 'if',
					cond: trim(m[1])
				});
			}
			// Set expression
			else if (m = expr.match(/\s*set\s+(\w+)(?:\s*=\s*(.*)?)?\s*/i)) {
				let dat = {
					type: 'set',
					svar: m[1],
					sval: m[2]
				};
				str = m[2]
					? proccessControls(str, i, null, dat, true)
					: proccessControls(str, i+2, /\s*endset\s*/i, dat);
			}
		}
		i = i + repl.length;
	}

	return str;
},

/**
 * Need to flush closure vars before next parsing.
 */
reset = function() {
	uid = 1;
	tokens = {};
},
		
/**
 * Resolve variables from the data scope.
 */
evl = function(data:any, buffer:any) {
	let parts = ~buffer.indexOf('.') ? buffer.split('.') : [buffer],
		i, l = parts.length,
		ret = data;
	
	for (i = 0; i < l; i++) {
		ret = ret[parts[i]];
		if (!ret) return '';
	}
	
	return typeof ret == 'function' ? ret.call(data) : ret;
},

/**
 * Check if array or object is empty.
 * @param {Array|Object}
 */
hasElements = function(obj:any) {
	if (obj.hasOwnProperty('length')) return !!obj.length;
	for (let k in obj) {
		if (obj.hasOwnProperty(k)) return true;
	}
	return false;
},

/**
 * Trim whitespaces.
 */
trim = function(s:any) {
	return s.replace(/^\s*|\s*$/g, '');
},

/**
 * Replace specified part of string.
 */
replaceWith = function(str:any, replace:any, start:any, end:any) {
	return str.substr(0, start) + replace + str.substr(end);
},

/**
 * Turn on debug messages about undefined vars and problems of parsing.
 */
__debug = false,
		
/**
 * Modifiers object.
 */
__modifiers: any = {},
		
/**
 * Run analysing and parsing.
 * @param {String} tplStr Template string.
 * @param {Object} tplData Data passed to the template.
 */
__parse = function(tplStr:any, tplData:any) {
	return reset(), process(proccessControls(proccessMarkers(tplStr), 0), tplData || {});
},
		
/**
 * Add new modifiers.
 */
__addModifiers = function(obj:any) {
	for (let i in obj) { 
		if (obj.hasOwnProperty(i)) __modifiers[i] = obj[i];
	}
};

let Ashe:any = {
	debug: __debug,
	parse: __parse,
	modifiers: __modifiers,
	addModifiers: __addModifiers
};

export const debug:any = __debug;
export const parse:any = __parse;
export const modifiers:any = __modifiers;
export const addModifiers:any = __addModifiers;