/**
 * ActionSheet: "choose an action" menus.
 *   iOS     → the system action sheet (ActionSheetIOS), exactly like Photos or Mail.
 *   Android → a Material 3 modal bottom sheet with a list of actions.
 *
 * Usage:  const showActions = useActionSheet();
 *         showActions({ title: 'Add photo', options: [{ label: 'Camera', icon: 'camera', onPress }] });
 */
import { createContext, useCallback, useContext, useState, type ComponentProps, type ReactNode } from 'react';
import { ActionSheetIOS, Platform } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import BottomSheet from './BottomSheet';
import { ListRow } from './Section';

export interface ActionOption {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
}

interface ActionSheetRequest {
  title?: string;
  message?: string;
  options: ActionOption[];
}

const ActionSheetContext = createContext<((req: ActionSheetRequest) => void) | null>(null);

export function ActionSheetProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ActionSheetRequest | null>(null);

  const show = useCallback((req: ActionSheetRequest) => {
    if (Platform.OS === 'ios') {
      const labels = [...req.options.map((o) => o.label), 'Cancel'];
      const destructive = req.options.map((o, i) => (o.destructive ? i : -1)).filter((i) => i >= 0);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: req.title,
          message: req.message,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: destructive,
        },
        (index) => req.options[index]?.onPress(),
      );
    } else {
      setRequest(req);
    }
  }, []);

  const close = () => setRequest(null);

  return (
    <ActionSheetContext.Provider value={show}>
      {children}
      {Platform.OS !== 'ios' && (
        <BottomSheet visible={!!request} title={request?.title ?? 'Choose an action'} onClose={close}>
          {request?.options.map((o) => (
            <ListRow
              key={o.label}
              icon={o.icon}
              title={o.label}
              destructive={o.destructive}
              onPress={() => {
                close();
                o.onPress();
              }}
            />
          ))}
        </BottomSheet>
      )}
    </ActionSheetContext.Provider>
  );
}

export function useActionSheet() {
  const show = useContext(ActionSheetContext);
  if (!show) throw new Error('useActionSheet must be used inside <ActionSheetProvider>');
  return show;
}
