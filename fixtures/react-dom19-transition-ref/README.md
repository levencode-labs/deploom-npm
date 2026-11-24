# Keep React Transition Group working on React DOM 19

The pinned React Transition Group 4.4.5 source falls back to ReactDOM.findDOMNode when a transition has no nodeRef. With React and React DOM 18.3.1, the CSS transition enters and exits through that fallback. With both packages at 19.3.0, the same transition fails when entering. A stable nodeRef passed to the transition and attached to its DOM child preserves both phases.

Check usages of Transition or CSSTransition that rely on the fallback. Use one DOM ref per keyed transition in a TransitionGroup. Review callbacks that previously received a DOM node. With nodeRef, callbacks read the node from the ref and the onEnter argument is the appearing flag.

Rerun the owning transition tests and exercise an enter and an exit in the UI. The fixture tests DOM classes, callback arguments and the error in jsdom 25.0.1 on Node 24.18.0 and npm 11.16.0. Browser animation timing remains a separate check.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned React Transition Group source at 4cb51a9b](https://github.com/reactjs/react-transition-group/blob/4cb51a9be0ebf508cb8f6506452097f7ebb874fe/src/Transition.js#L216-L239)
- [React 19 removal of findDOMNode](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-reactdom-finddomnode)
- [React Transition Group nodeRef API](https://reactcommunity.org/react-transition-group/transition/#noderef)
