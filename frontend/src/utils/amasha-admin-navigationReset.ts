import { CommonActions } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

// Walks up to the top-most navigator so the reset clears
// every parent's history too — not just the current nested stack.
export function resetToRoot(
  navigation: NavigationProp<any>,
  routeName: string,
  params?: object,
) {
  let target: NavigationProp<any> = navigation;

  while (target.getParent()) {
    target = target.getParent()!;
  }

  target.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    }),
  );
}