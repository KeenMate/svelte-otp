
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Chunk.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\Chunk.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let input;
    	let input_class_value;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			attr_dev(input, "class", input_class_value = "input " + (/*$$restProps*/ ctx[8].class || ''));
    			input.value = /*value*/ ctx[1];
    			attr_dev(input, "type", /*type*/ ctx[5]);
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[3]);
    			attr_dev(input, "pattern", /*pattern*/ ctx[4]);
    			input.disabled = /*disabled*/ ctx[6];
    			add_location(input, file$2, 24, 1, 557);
    			attr_dev(div, "class", div_class_value = "field " + (/*$$restProps*/ ctx[8].containerClass || ''));
    			attr_dev(div, "title", /*title*/ ctx[2]);
    			add_location(div, file$2, 23, 0, 492);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			/*input_binding*/ ctx[12](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*onInput*/ ctx[7], false, false, false),
    					listen_dev(input, "change", /*change_handler*/ ctx[9], false, false, false),
    					listen_dev(input, "beforeinput", /*beforeinput_handler*/ ctx[10], false, false, false),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$$restProps*/ 256 && input_class_value !== (input_class_value = "input " + (/*$$restProps*/ ctx[8].class || ''))) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				prop_dev(input, "value", /*value*/ ctx[1]);
    			}

    			if (dirty & /*type*/ 32) {
    				attr_dev(input, "type", /*type*/ ctx[5]);
    			}

    			if (dirty & /*placeholder*/ 8) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[3]);
    			}

    			if (dirty & /*pattern*/ 16) {
    				attr_dev(input, "pattern", /*pattern*/ ctx[4]);
    			}

    			if (dirty & /*disabled*/ 64) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[6]);
    			}

    			if (dirty & /*$$restProps*/ 256 && div_class_value !== (div_class_value = "field " + (/*$$restProps*/ ctx[8].containerClass || ''))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*title*/ 4) {
    				attr_dev(div, "title", /*title*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*input_binding*/ ctx[12](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const omit_props_names = ["inputElement","value","title","placeholder","pattern","type","disabled"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Chunk', slots, []);
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

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		inputElement,
    		value,
    		title,
    		placeholder,
    		pattern,
    		type,
    		disabled,
    		dispatch,
    		onInput
    	});

    	$$self.$inject_state = $$new_props => {
    		if ('inputElement' in $$props) $$invalidate(0, inputElement = $$new_props.inputElement);
    		if ('value' in $$props) $$invalidate(1, value = $$new_props.value);
    		if ('title' in $$props) $$invalidate(2, title = $$new_props.title);
    		if ('placeholder' in $$props) $$invalidate(3, placeholder = $$new_props.placeholder);
    		if ('pattern' in $$props) $$invalidate(4, pattern = $$new_props.pattern);
    		if ('type' in $$props) $$invalidate(5, type = $$new_props.type);
    		if ('disabled' in $$props) $$invalidate(6, disabled = $$new_props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class Chunk extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			inputElement: 0,
    			value: 1,
    			title: 2,
    			placeholder: 3,
    			pattern: 4,
    			type: 5,
    			disabled: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Chunk",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get inputElement() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputElement(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pattern() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pattern(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Chunk>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Chunk>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    var css_248z = "";
    styleInject(css_248z);

    /* src\OneTimePass.svelte generated by Svelte v3.46.4 */
    const file$1 = "src\\OneTimePass.svelte";

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

    	chunk = new Chunk({ props: chunk_props, $$inline: true });
    	binding_callbacks.push(() => bind(chunk, 'inputElement', chunk_inputElement_binding));
    	chunk.$on("beforeinput", beforeinput_handler);
    	chunk.$on("originalInput", originalInput_handler);
    	chunk.$on("keydown", keydown_handler);

    	const block = {
    		c: function create() {
    			create_component(chunk.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(chunk, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chunk.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chunk.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(chunk, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(189:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (187:2) {#if chunkValue === Separator}
    function create_if_block(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("-");
    			attr_dev(span, "class", /*separatorCLass*/ ctx[6]);
    			add_location(span, file$1, 187, 3, 5406);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*separatorCLass*/ 64) {
    				attr_dev(span, "class", /*separatorCLass*/ ctx[6]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(187:2) {#if chunkValue === Separator}",
    		ctx
    	});

    	return block;
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

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(186:1) {#each sanitizedValueWithSeparators as chunkValue, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t;
    	let div;
    	let current;
    	let each_value = /*sanitizedValueWithSeparators*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			t = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", /*containerClass*/ ctx[5]);
    			add_location(div, file$1, 184, 0, 5283);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*separatorCLass, sanitizedValueWithSeparators, Separator, createPattern, onlyNumbers, chunkLength, isDisabled, ChunksFilledCount, inputClass, inputContainerClass, chunkInputs, beforeChunkChanged, chunkChanged, keystroke*/ 16351) {
    				each_value = /*sanitizedValueWithSeparators*/ ctx[9];
    				validate_each_argument(each_value);
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
    				attr_dev(div, "class", /*containerClass*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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

    function instance$1($$self, $$props, $$invalidate) {
    	let sanitizedValue;
    	let sanitizedValueWithSeparators;
    	let ChunksFilledCount;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('OneTimePass', slots, []);
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

    	const writable_props = [
    		'value',
    		'valueWithSeparators',
    		'onlyNumbers',
    		'chunksCount',
    		'chunkLength',
    		'inputClass',
    		'inputContainerClass',
    		'containerClass',
    		'separatorCLass'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<OneTimePass> was created with unknown prop '${key}'`);
    	});

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

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		tick,
    		Chunk,
    		dispatch,
    		Separator,
    		value,
    		valueWithSeparators,
    		onlyNumbers,
    		chunksCount,
    		chunkLength,
    		inputClass,
    		inputContainerClass,
    		containerClass,
    		separatorCLass,
    		chunkInputs,
    		createPattern,
    		zipWithSeparators,
    		sanitizeValue,
    		getChunkValues,
    		getEmptyArray,
    		chunksFilledChanged,
    		getChunksFilledCount,
    		beforeChunkChanged,
    		keystroke,
    		chunkChanged,
    		getUpdatedChunks,
    		getValueFromEvent,
    		isDisabled,
    		moveCursor,
    		sanitizedValue,
    		ChunksFilledCount,
    		sanitizedValueWithSeparators
    	});

    	$$self.$inject_state = $$props => {
    		if ('value' in $$props) $$invalidate(14, value = $$props.value);
    		if ('valueWithSeparators' in $$props) $$invalidate(15, valueWithSeparators = $$props.valueWithSeparators);
    		if ('onlyNumbers' in $$props) $$invalidate(1, onlyNumbers = $$props.onlyNumbers);
    		if ('chunksCount' in $$props) $$invalidate(16, chunksCount = $$props.chunksCount);
    		if ('chunkLength' in $$props) $$invalidate(2, chunkLength = $$props.chunkLength);
    		if ('inputClass' in $$props) $$invalidate(3, inputClass = $$props.inputClass);
    		if ('inputContainerClass' in $$props) $$invalidate(4, inputContainerClass = $$props.inputContainerClass);
    		if ('containerClass' in $$props) $$invalidate(5, containerClass = $$props.containerClass);
    		if ('separatorCLass' in $$props) $$invalidate(6, separatorCLass = $$props.separatorCLass);
    		if ('chunkInputs' in $$props) $$invalidate(7, chunkInputs = $$props.chunkInputs);
    		if ('sanitizedValue' in $$props) $$invalidate(17, sanitizedValue = $$props.sanitizedValue);
    		if ('ChunksFilledCount' in $$props) $$invalidate(8, ChunksFilledCount = $$props.ChunksFilledCount);
    		if ('sanitizedValueWithSeparators' in $$props) $$invalidate(9, sanitizedValueWithSeparators = $$props.sanitizedValueWithSeparators);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

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

    class OneTimePass extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
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

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OneTimePass",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[14] === undefined && !('value' in props)) {
    			console.warn("<OneTimePass> was created without expected prop 'value'");
    		}

    		if (/*valueWithSeparators*/ ctx[15] === undefined && !('valueWithSeparators' in props)) {
    			console.warn("<OneTimePass> was created without expected prop 'valueWithSeparators'");
    		}
    	}

    	get Separator() {
    		return this.$$.ctx[0];
    	}

    	set Separator(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valueWithSeparators() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valueWithSeparators(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onlyNumbers() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onlyNumbers(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get chunksCount() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chunksCount(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get chunkLength() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chunkLength(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inputClass() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputClass(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inputContainerClass() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputContainerClass(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerClass() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerClass(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get separatorCLass() {
    		throw new Error("<OneTimePass>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set separatorCLass(value) {
    		throw new Error("<OneTimePass>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* dev\src\App.svelte generated by Svelte v3.46.4 */
    const file = "dev\\src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h10;
    	let t1;
    	let p;
    	let t2;
    	let onetimepass;
    	let updating_value;
    	let updating_onlyNumbers;
    	let updating_chunksCount;
    	let updating_valueWithSeparators;
    	let t3;
    	let div4;
    	let h11;
    	let t5;
    	let div0;
    	let t6;
    	let input0;
    	let t7;
    	let div1;
    	let t8;
    	let input1;
    	let t9;
    	let t10_value = JSON.stringify(/*value*/ ctx[0]) + "";
    	let t10;
    	let t11;
    	let div2;
    	let t12;
    	let input2;
    	let t13;
    	let div3;
    	let t14;
    	let input3;
    	let t15;
    	let br;
    	let t16;
    	let b;
    	let t18;
    	let ul;
    	let li0;
    	let t20;
    	let li1;
    	let t22;
    	let li2;
    	let t24;
    	let li3;
    	let current;
    	let mounted;
    	let dispose;

    	function onetimepass_value_binding(value) {
    		/*onetimepass_value_binding*/ ctx[5](value);
    	}

    	function onetimepass_onlyNumbers_binding(value) {
    		/*onetimepass_onlyNumbers_binding*/ ctx[6](value);
    	}

    	function onetimepass_chunksCount_binding(value) {
    		/*onetimepass_chunksCount_binding*/ ctx[7](value);
    	}

    	function onetimepass_valueWithSeparators_binding(value) {
    		/*onetimepass_valueWithSeparators_binding*/ ctx[8](value);
    	}

    	let onetimepass_props = { chunkLength: /*chunkLength*/ ctx[3] };

    	if (/*value*/ ctx[0] !== void 0) {
    		onetimepass_props.value = /*value*/ ctx[0];
    	}

    	if (/*onlyNumbers*/ ctx[1] !== void 0) {
    		onetimepass_props.onlyNumbers = /*onlyNumbers*/ ctx[1];
    	}

    	if (/*chunksCount*/ ctx[2] !== void 0) {
    		onetimepass_props.chunksCount = /*chunksCount*/ ctx[2];
    	}

    	if (/*valueWithSeparators*/ ctx[4] !== void 0) {
    		onetimepass_props.valueWithSeparators = /*valueWithSeparators*/ ctx[4];
    	}

    	onetimepass = new OneTimePass({ props: onetimepass_props, $$inline: true });
    	binding_callbacks.push(() => bind(onetimepass, 'value', onetimepass_value_binding));
    	binding_callbacks.push(() => bind(onetimepass, 'onlyNumbers', onetimepass_onlyNumbers_binding));
    	binding_callbacks.push(() => bind(onetimepass, 'chunksCount', onetimepass_chunksCount_binding));
    	binding_callbacks.push(() => bind(onetimepass, 'valueWithSeparators', onetimepass_valueWithSeparators_binding));

    	const block = {
    		c: function create() {
    			main = element("main");
    			h10 = element("h1");
    			h10.textContent = "Svelte otp test";
    			t1 = space();
    			p = element("p");
    			t2 = space();
    			create_component(onetimepass.$$.fragment);
    			t3 = space();
    			div4 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Options";
    			t5 = space();
    			div0 = element("div");
    			t6 = text("onlyNumbers ");
    			input0 = element("input");
    			t7 = space();
    			div1 = element("div");
    			t8 = text("value: ");
    			input1 = element("input");
    			t9 = text(" || ");
    			t10 = text(t10_value);
    			t11 = space();
    			div2 = element("div");
    			t12 = text("chunks: ");
    			input2 = element("input");
    			t13 = space();
    			div3 = element("div");
    			t14 = text("chunkLength: ");
    			input3 = element("input");
    			t15 = space();
    			br = element("br");
    			t16 = space();
    			b = element("b");
    			b.textContent = "+ styling props";
    			t18 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "inputClass";
    			t20 = space();
    			li1 = element("li");
    			li1.textContent = "inputContainerClass";
    			t22 = space();
    			li2 = element("li");
    			li2.textContent = "containerClass";
    			t24 = space();
    			li3 = element("li");
    			li3.textContent = "separatorCLass";
    			add_location(h10, file, 6, 2, 166);
    			add_location(p, file, 7, 2, 194);
    			add_location(main, file, 5, 0, 156);
    			add_location(h11, file, 18, 2, 352);
    			attr_dev(input0, "type", "checkbox");
    			add_location(input0, file, 20, 16, 395);
    			add_location(div0, file, 19, 2, 372);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file, 23, 11, 479);
    			add_location(div1, file, 22, 2, 461);
    			attr_dev(input2, "type", "number");
    			add_location(input2, file, 27, 15, 601);
    			add_location(div2, file, 27, 2, 588);
    			attr_dev(input3, "type", "number");
    			add_location(input3, file, 28, 20, 677);
    			add_location(div3, file, 28, 2, 659);
    			add_location(br, file, 29, 2, 735);
    			add_location(b, file, 30, 2, 745);
    			add_location(li0, file, 32, 4, 782);
    			add_location(li1, file, 33, 4, 807);
    			add_location(li2, file, 34, 4, 841);
    			add_location(li3, file, 35, 4, 870);
    			add_location(ul, file, 31, 2, 772);
    			add_location(div4, file, 17, 0, 343);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h10);
    			append_dev(main, t1);
    			append_dev(main, p);
    			append_dev(main, t2);
    			mount_component(onetimepass, main, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h11);
    			append_dev(div4, t5);
    			append_dev(div4, div0);
    			append_dev(div0, t6);
    			append_dev(div0, input0);
    			input0.checked = /*onlyNumbers*/ ctx[1];
    			append_dev(div4, t7);
    			append_dev(div4, div1);
    			append_dev(div1, t8);
    			append_dev(div1, input1);
    			set_input_value(input1, /*valueWithSeparators*/ ctx[4]);
    			append_dev(div1, t9);
    			append_dev(div1, t10);
    			append_dev(div4, t11);
    			append_dev(div4, div2);
    			append_dev(div2, t12);
    			append_dev(div2, input2);
    			set_input_value(input2, /*chunksCount*/ ctx[2]);
    			append_dev(div4, t13);
    			append_dev(div4, div3);
    			append_dev(div3, t14);
    			append_dev(div3, input3);
    			set_input_value(input3, /*chunkLength*/ ctx[3]);
    			append_dev(div4, t15);
    			append_dev(div4, br);
    			append_dev(div4, t16);
    			append_dev(div4, b);
    			append_dev(div4, t18);
    			append_dev(div4, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t20);
    			append_dev(ul, li1);
    			append_dev(ul, t22);
    			append_dev(ul, li2);
    			append_dev(ul, t24);
    			append_dev(ul, li3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const onetimepass_changes = {};
    			if (dirty & /*chunkLength*/ 8) onetimepass_changes.chunkLength = /*chunkLength*/ ctx[3];

    			if (!updating_value && dirty & /*value*/ 1) {
    				updating_value = true;
    				onetimepass_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			if (!updating_onlyNumbers && dirty & /*onlyNumbers*/ 2) {
    				updating_onlyNumbers = true;
    				onetimepass_changes.onlyNumbers = /*onlyNumbers*/ ctx[1];
    				add_flush_callback(() => updating_onlyNumbers = false);
    			}

    			if (!updating_chunksCount && dirty & /*chunksCount*/ 4) {
    				updating_chunksCount = true;
    				onetimepass_changes.chunksCount = /*chunksCount*/ ctx[2];
    				add_flush_callback(() => updating_chunksCount = false);
    			}

    			if (!updating_valueWithSeparators && dirty & /*valueWithSeparators*/ 16) {
    				updating_valueWithSeparators = true;
    				onetimepass_changes.valueWithSeparators = /*valueWithSeparators*/ ctx[4];
    				add_flush_callback(() => updating_valueWithSeparators = false);
    			}

    			onetimepass.$set(onetimepass_changes);

    			if (dirty & /*onlyNumbers*/ 2) {
    				input0.checked = /*onlyNumbers*/ ctx[1];
    			}

    			if (dirty & /*valueWithSeparators*/ 16 && input1.value !== /*valueWithSeparators*/ ctx[4]) {
    				set_input_value(input1, /*valueWithSeparators*/ ctx[4]);
    			}

    			if ((!current || dirty & /*value*/ 1) && t10_value !== (t10_value = JSON.stringify(/*value*/ ctx[0]) + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*chunksCount*/ 4 && to_number(input2.value) !== /*chunksCount*/ ctx[2]) {
    				set_input_value(input2, /*chunksCount*/ ctx[2]);
    			}

    			if (dirty & /*chunkLength*/ 8 && to_number(input3.value) !== /*chunkLength*/ ctx[3]) {
    				set_input_value(input3, /*chunkLength*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(onetimepass.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(onetimepass.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(onetimepass);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let value, onlyNumbers, chunksCount, chunkLength, valueWithSeparators;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function onetimepass_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function onetimepass_onlyNumbers_binding(value) {
    		onlyNumbers = value;
    		$$invalidate(1, onlyNumbers);
    	}

    	function onetimepass_chunksCount_binding(value) {
    		chunksCount = value;
    		$$invalidate(2, chunksCount);
    	}

    	function onetimepass_valueWithSeparators_binding(value) {
    		valueWithSeparators = value;
    		$$invalidate(4, valueWithSeparators);
    	}

    	function input0_change_handler() {
    		onlyNumbers = this.checked;
    		$$invalidate(1, onlyNumbers);
    	}

    	function input1_input_handler() {
    		valueWithSeparators = this.value;
    		$$invalidate(4, valueWithSeparators);
    	}

    	function input2_input_handler() {
    		chunksCount = to_number(this.value);
    		$$invalidate(2, chunksCount);
    	}

    	function input3_input_handler() {
    		chunkLength = to_number(this.value);
    		$$invalidate(3, chunkLength);
    	}

    	$$self.$capture_state = () => ({
    		OneTimePass,
    		value,
    		onlyNumbers,
    		chunksCount,
    		chunkLength,
    		valueWithSeparators
    	});

    	$$self.$inject_state = $$props => {
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('onlyNumbers' in $$props) $$invalidate(1, onlyNumbers = $$props.onlyNumbers);
    		if ('chunksCount' in $$props) $$invalidate(2, chunksCount = $$props.chunksCount);
    		if ('chunkLength' in $$props) $$invalidate(3, chunkLength = $$props.chunkLength);
    		if ('valueWithSeparators' in $$props) $$invalidate(4, valueWithSeparators = $$props.valueWithSeparators);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		onlyNumbers,
    		chunksCount,
    		chunkLength,
    		valueWithSeparators,
    		onetimepass_value_binding,
    		onetimepass_onlyNumbers_binding,
    		onetimepass_chunksCount_binding,
    		onetimepass_valueWithSeparators_binding,
    		input0_change_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
