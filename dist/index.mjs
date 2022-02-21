function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}
function compute_rest_props(props, keys) {
    const rest = {};
    keys = new Set(keys);
    for (const k in props)
        if (!keys.has(k) && k[0] !== '$')
            rest[k] = props[k];
    return rest;
}
function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail, bubbles = false) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* src\Chunk.svelte generated by Svelte v3.46.4 */

function create_fragment$1(ctx) {
	let div;
	let input;
	let input_class_value;
	let div_class_value;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			input = element("input");
			attr(input, "class", input_class_value = "input " + (/*$$restProps*/ ctx[8].class || ''));
			input.value = /*value*/ ctx[1];
			attr(input, "type", /*type*/ ctx[5]);
			attr(input, "placeholder", /*placeholder*/ ctx[3]);
			attr(input, "pattern", /*pattern*/ ctx[4]);
			input.disabled = /*disabled*/ ctx[6];
			attr(div, "class", div_class_value = "field " + (/*$$restProps*/ ctx[8].containerClass || ''));
			attr(div, "title", /*title*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, input);
			/*input_binding*/ ctx[12](input);

			if (!mounted) {
				dispose = [
					listen(input, "input", /*onInput*/ ctx[7]),
					listen(input, "change", /*change_handler*/ ctx[9]),
					listen(input, "beforeinput", /*beforeinput_handler*/ ctx[10]),
					listen(input, "keydown", /*keydown_handler*/ ctx[11])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*$$restProps*/ 256 && input_class_value !== (input_class_value = "input " + (/*$$restProps*/ ctx[8].class || ''))) {
				attr(input, "class", input_class_value);
			}

			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
				input.value = /*value*/ ctx[1];
			}

			if (dirty & /*type*/ 32) {
				attr(input, "type", /*type*/ ctx[5]);
			}

			if (dirty & /*placeholder*/ 8) {
				attr(input, "placeholder", /*placeholder*/ ctx[3]);
			}

			if (dirty & /*pattern*/ 16) {
				attr(input, "pattern", /*pattern*/ ctx[4]);
			}

			if (dirty & /*disabled*/ 64) {
				input.disabled = /*disabled*/ ctx[6];
			}

			if (dirty & /*$$restProps*/ 256 && div_class_value !== (div_class_value = "field " + (/*$$restProps*/ ctx[8].containerClass || ''))) {
				attr(div, "class", div_class_value);
			}

			if (dirty & /*title*/ 4) {
				attr(div, "title", /*title*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*input_binding*/ ctx[12](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	const omit_props_names = ["inputElement","value","title","placeholder","pattern","type","disabled"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { inputElement = null } = $$props;
	let { value = "" } = $$props;
	let { title = "" } = $$props;
	let { placeholder = "" } = $$props;
	let { pattern = null } = $$props;
	let { type = "text" } = $$props;
	let { disabled = false } = $$props;
	const dispatch = createEventDispatcher();

	function onInput(ev) {
		dispatch("originalInput", ev);
		const targetValue = ev.target.value;
		$$invalidate(1, value = targetValue);
		dispatch("input", targetValue);
	}

	function change_handler(event) {
		bubble.call(this, $$self, event);
	}

	function beforeinput_handler(event) {
		bubble.call(this, $$self, event);
	}

	function keydown_handler(event) {
		bubble.call(this, $$self, event);
	}

	function input_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			inputElement = $$value;
			$$invalidate(0, inputElement);
		});
	}

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(8, $$restProps = compute_rest_props($$props, omit_props_names));
		if ('inputElement' in $$new_props) $$invalidate(0, inputElement = $$new_props.inputElement);
		if ('value' in $$new_props) $$invalidate(1, value = $$new_props.value);
		if ('title' in $$new_props) $$invalidate(2, title = $$new_props.title);
		if ('placeholder' in $$new_props) $$invalidate(3, placeholder = $$new_props.placeholder);
		if ('pattern' in $$new_props) $$invalidate(4, pattern = $$new_props.pattern);
		if ('type' in $$new_props) $$invalidate(5, type = $$new_props.type);
		if ('disabled' in $$new_props) $$invalidate(6, disabled = $$new_props.disabled);
	};

	return [
		inputElement,
		value,
		title,
		placeholder,
		pattern,
		type,
		disabled,
		onInput,
		$$restProps,
		change_handler,
		beforeinput_handler,
		keydown_handler,
		input_binding
	];
}

class Chunk extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
			inputElement: 0,
			value: 1,
			title: 2,
			placeholder: 3,
			pattern: 4,
			type: 5,
			disabled: 6
		});
	}
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = ".one-time-pass{display:flex;gap:1rem;align-items:center}.one-time-pass .field{margin-bottom:0 !important;width:3.5rem}.one-time-pass .field input{text-align:center}.otp-default-input{width:100%;padding:8px 12px;margin:8px 0;display:inline-block;border:1px solid #ccc;border-radius:4px;box-sizing:border-box}";
styleInject(css_248z);

/* src\OneTimePass.svelte generated by Svelte v3.46.4 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[28] = list[i];
	child_ctx[29] = list;
	child_ctx[30] = i;
	return child_ctx;
}

// (189:2) {:else}
function create_else_block(ctx) {
	let chunk;
	let updating_inputElement;
	let current;

	function chunk_inputElement_binding(value) {
		/*chunk_inputElement_binding*/ ctx[18](value, /*i*/ ctx[30]);
	}

	function beforeinput_handler(...args) {
		return /*beforeinput_handler*/ ctx[19](/*i*/ ctx[30], ...args);
	}

	function originalInput_handler(...args) {
		return /*originalInput_handler*/ ctx[20](/*i*/ ctx[30], ...args);
	}

	function keydown_handler(...args) {
		return /*keydown_handler*/ ctx[21](/*i*/ ctx[30], ...args);
	}

	let chunk_props = {
		value: /*chunkValue*/ ctx[28],
		pattern: createPattern(/*onlyNumbers*/ ctx[1], /*chunkLength*/ ctx[2]),
		disabled: /*isDisabled*/ ctx[13](/*i*/ ctx[30] / 2, /*ChunksFilledCount*/ ctx[8]),
		class: /*inputClass*/ ctx[3],
		containerClass: /*inputContainerClass*/ ctx[4]
	};

	if (/*chunkInputs*/ ctx[7][/*i*/ ctx[30] / 2] !== void 0) {
		chunk_props.inputElement = /*chunkInputs*/ ctx[7][/*i*/ ctx[30] / 2];
	}

	chunk = new Chunk({ props: chunk_props });
	binding_callbacks.push(() => bind(chunk, 'inputElement', chunk_inputElement_binding));
	chunk.$on("beforeinput", beforeinput_handler);
	chunk.$on("originalInput", originalInput_handler);
	chunk.$on("keydown", keydown_handler);

	return {
		c() {
			create_component(chunk.$$.fragment);
		},
		m(target, anchor) {
			mount_component(chunk, target, anchor);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const chunk_changes = {};
			if (dirty & /*sanitizedValueWithSeparators*/ 512) chunk_changes.value = /*chunkValue*/ ctx[28];
			if (dirty & /*onlyNumbers, chunkLength*/ 6) chunk_changes.pattern = createPattern(/*onlyNumbers*/ ctx[1], /*chunkLength*/ ctx[2]);
			if (dirty & /*ChunksFilledCount*/ 256) chunk_changes.disabled = /*isDisabled*/ ctx[13](/*i*/ ctx[30] / 2, /*ChunksFilledCount*/ ctx[8]);
			if (dirty & /*inputClass*/ 8) chunk_changes.class = /*inputClass*/ ctx[3];
			if (dirty & /*inputContainerClass*/ 16) chunk_changes.containerClass = /*inputContainerClass*/ ctx[4];

			if (!updating_inputElement && dirty & /*chunkInputs*/ 128) {
				updating_inputElement = true;
				chunk_changes.inputElement = /*chunkInputs*/ ctx[7][/*i*/ ctx[30] / 2];
				add_flush_callback(() => updating_inputElement = false);
			}

			chunk.$set(chunk_changes);
		},
		i(local) {
			if (current) return;
			transition_in(chunk.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(chunk.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(chunk, detaching);
		}
	};
}

// (187:2) {#if chunkValue === Separator}
function create_if_block(ctx) {
	let span;
	let t;

	return {
		c() {
			span = element("span");
			t = text("-");
			attr(span, "class", /*separatorCLass*/ ctx[6]);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*separatorCLass*/ 64) {
				attr(span, "class", /*separatorCLass*/ ctx[6]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (186:1) {#each sanitizedValueWithSeparators as chunkValue, i}
function create_each_block(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*chunkValue*/ ctx[28] === /*Separator*/ ctx[0]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment(ctx) {
	let t;
	let div;
	let current;
	let each_value = /*sanitizedValueWithSeparators*/ ctx[9];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			t = space();
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", /*containerClass*/ ctx[5]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*separatorCLass, sanitizedValueWithSeparators, Separator, createPattern, onlyNumbers, chunkLength, isDisabled, ChunksFilledCount, inputClass, inputContainerClass, chunkInputs, beforeChunkChanged, chunkChanged, keystroke*/ 16351) {
				each_value = /*sanitizedValueWithSeparators*/ ctx[9];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (!current || dirty & /*containerClass*/ 32) {
				attr(div, "class", /*containerClass*/ ctx[5]);
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(t);
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function createPattern(numbers, length) {
	return (numbers ? "[0-9]" : ".") + "{" + length + "}";
}

function getEmptyArray(length) {
	return Array.from(new Array(length), () => "");
}

function getUpdatedChunks(chunks, value, idx) {
	return chunks.map((x, i) => i === idx ? value : x);
}

function getValueFromEvent(event) {
	if (event instanceof CustomEvent) {
		// manual event
		if (event.data === null) return event.substring(0, event.length - 1); else // because this event is composed from previous chunk - thus preceding the original value
		return event.detail + event.target.value;
	} else return event.target.value;
}

//this maybe doesnt work for old ie, not sure
function moveCursor(el, pos) {
	if (el && el.setSelectionRange) {
		el.focus();
		el.setSelectionRange(pos, pos);
	}
}

function instance($$self, $$props, $$invalidate) {
	let sanitizedValue;
	let sanitizedValueWithSeparators;
	let ChunksFilledCount;
	const dispatch = createEventDispatcher();
	const Separator = "-";
	let { value } = $$props;
	let { valueWithSeparators } = $$props;
	let { onlyNumbers = true } = $$props;
	let { chunksCount = 3 } = $$props;
	let { chunkLength = 3 } = $$props;
	let { inputClass = "otp-default-input" } = $$props;
	let { inputContainerClass = "" } = $$props;
	let { containerClass = "one-time-pass" } = $$props;
	let { separatorCLass = "" } = $$props;
	let chunkInputs = [];

	function zipWithSeparators(chunks, chunksCunt) {
		return chunks.flatMap(c => [Separator, c]).slice(1);
	}

	function sanitizeValue(value) {
		if (value && value instanceof Array && value.length === chunksCount) return value;
		if (typeof value === "string" && value.length) return getChunkValues(value);
		return getEmptyArray(chunksCount);
	}

	function getChunkValues(val) {
		const emptyChunks = getEmptyArray(chunksCount);
		const newChunks = val.match(new RegExp(`.{1,${chunkLength}}`, "g"));
		if (!newChunks) return emptyChunks;
		if (newChunks.length === chunksCount) return newChunks;
		return emptyChunks.map((x, i) => newChunks[i] || x);
	}

	function chunksFilledChanged(val) {
		let index = val?.map(x => x.length < chunkLength).findIndex(x => x);

		//check if found
		if (index != -1) {
			tick().then(() => {
				chunkInputs[index]?.focus();
				moveCursor(chunkInputs[index], chunkInputs[index].value.length);
			});
		}
	}

	function getChunksFilledCount(val) {
		return val?.reduce((acc, x) => acc + (x.length === chunkLength && 1 || 0), 0) || 0;
	}

	function beforeChunkChanged(ev, idx) {
		let invalid = false;

		if (ev.data === null) {
			if (sanitizedValue[idx].length === 1) setTimeout(() => chunkInputs[idx - 1]?.focus(), 0);
			return;
		}

		if (!invalid && ev.data.length > 1) {
			// Probably pasting code
			// TODO prevent default instead of returning if it isnt right size
			//	ev.preventDefault();
			const numbers = ev.data.match(/\d/g);

			if (!numbers || numbers.length !== chunksCount * chunkLength) invalid = true; else {
				const numbersString = numbers.join("");
				$$invalidate(14, value = getChunkValues(numbersString));
				dispatch("change", value);
			}

			// Skip further input events for this flow
			invalid = true;
		}

		if (onlyNumbers) {
			const parsed = parseInt(ev.data);
			if (isNaN(parsed)) invalid = true;
		}

		if ((sanitizedValue[idx] + ev.data).length > chunkLength) {
			if (!invalid) {
				// Check if this is not last one
				if (chunkInputs[idx + 1]?.value.length < chunkLength) {
					$$invalidate(7, chunkInputs[idx + 1].value = parsed + chunkInputs[idx + 1].value, chunkInputs);

					tick().then(() => {
						chunkInputs[idx + 1]?.focus();
					});
				}
			}

			invalid = true;
		}

		if (invalid) {
			ev.preventDefault();
			ev.stopImmediatePropagation();
		}

		return !invalid;
	}

	function keystroke(ev, idx) {
		// 37: left 39: right
		if (ev.keyCode == 39) {
			//only moves if you are on end of text
			if (chunkInputs[idx + 1] && chunkInputs[idx].selectionStart == chunkInputs[idx].value.length) {
				ev.preventDefault();

				tick().then(() => {
					chunkInputs[idx + 1]?.focus();
					moveCursor(chunkInputs[idx + 1], 0);
				});
			}
		}

		if (ev.keyCode == 37 || ev.keyCode == 8) {
			//only moves, if you are in the beginning and dont have any text selected
			if (chunkInputs[idx - 1] && chunkInputs[idx].selectionStart == 0 && chunkInputs[idx].selectionEnd == 0) {
				ev.preventDefault();

				tick().then(() => {
					chunkInputs[idx - 1]?.focus();
					moveCursor(chunkInputs[idx - 1], chunkInputs[idx - 1].value.length);
				});
			}
		}
	}

	function chunkChanged(ev, idx) {
		$$invalidate(14, value = getUpdatedChunks(sanitizedValue, getValueFromEvent(ev), idx));
		dispatch("change", value);
	}

	//will disable only if its empty
	function isDisabled(idx, chunksFilled) {
		return idx > chunksFilled && !chunkInputs[idx]?.value;
	}

	function chunk_inputElement_binding(value, i) {
		if ($$self.$$.not_equal(chunkInputs[i / 2], value)) {
			chunkInputs[i / 2] = value;
			$$invalidate(7, chunkInputs);
		}
	}

	const beforeinput_handler = (i, ev) => beforeChunkChanged(ev, i / 2);
	const originalInput_handler = (i, { detail: ev }) => chunkChanged(ev, i / 2);
	const keydown_handler = (i, ev) => keystroke(ev, i / 2);

	$$self.$$set = $$props => {
		if ('value' in $$props) $$invalidate(14, value = $$props.value);
		if ('valueWithSeparators' in $$props) $$invalidate(15, valueWithSeparators = $$props.valueWithSeparators);
		if ('onlyNumbers' in $$props) $$invalidate(1, onlyNumbers = $$props.onlyNumbers);
		if ('chunksCount' in $$props) $$invalidate(16, chunksCount = $$props.chunksCount);
		if ('chunkLength' in $$props) $$invalidate(2, chunkLength = $$props.chunkLength);
		if ('inputClass' in $$props) $$invalidate(3, inputClass = $$props.inputClass);
		if ('inputContainerClass' in $$props) $$invalidate(4, inputContainerClass = $$props.inputContainerClass);
		if ('containerClass' in $$props) $$invalidate(5, containerClass = $$props.containerClass);
		if ('separatorCLass' in $$props) $$invalidate(6, separatorCLass = $$props.separatorCLass);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value*/ 16384) {
			$$invalidate(15, valueWithSeparators = value?.join(Separator));
		}

		if ($$self.$$.dirty & /*value, chunksCount*/ 81920) {
			$$invalidate(17, sanitizedValue = sanitizeValue(value));
		}

		if ($$self.$$.dirty & /*sanitizedValue*/ 131072) {
			$$invalidate(9, sanitizedValueWithSeparators = zipWithSeparators(sanitizedValue));
		}

		if ($$self.$$.dirty & /*sanitizedValue*/ 131072) {
			$$invalidate(8, ChunksFilledCount = getChunksFilledCount(sanitizedValue));
		}

		if ($$self.$$.dirty & /*sanitizedValue*/ 131072) {
			chunksFilledChanged(sanitizedValue);
		}
	};

	return [
		Separator,
		onlyNumbers,
		chunkLength,
		inputClass,
		inputContainerClass,
		containerClass,
		separatorCLass,
		chunkInputs,
		ChunksFilledCount,
		sanitizedValueWithSeparators,
		beforeChunkChanged,
		keystroke,
		chunkChanged,
		isDisabled,
		value,
		valueWithSeparators,
		chunksCount,
		sanitizedValue,
		chunk_inputElement_binding,
		beforeinput_handler,
		originalInput_handler,
		keydown_handler
	];
}

class OneTimePass extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance, create_fragment, safe_not_equal, {
			Separator: 0,
			value: 14,
			valueWithSeparators: 15,
			onlyNumbers: 1,
			chunksCount: 16,
			chunkLength: 2,
			inputClass: 3,
			inputContainerClass: 4,
			containerClass: 5,
			separatorCLass: 6
		});
	}

	get Separator() {
		return this.$$.ctx[0];
	}
}

export { OneTimePass };
