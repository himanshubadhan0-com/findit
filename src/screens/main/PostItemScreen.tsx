/**
 * PostItemScreen: post a Lost or Found item.
 * On submit: upload compressed photos → insert the item → run smart
 * matching → open the new post, showing how many matches were found.
 */
import { useState } from 'react';

import Screen from '../../components/Screen';
import ItemForm from '../../components/ItemForm';
import { useAuth } from '../../context/AuthContext';
import { createItem } from '../../services/items';
import { toISODate } from '../../utils/dateHelpers';
import { haptics } from '../../utils/haptics';
import { getErrorMessage } from '../../utils/errors';
import type { TabScreenProps } from '../../navigation/types';
import type { ItemForm as Form } from '../../utils/validators';

const emptyForm = (): Form => ({
  type: null,
  title: '',
  description: '',
  category: null,
  location: null,
  date: toISODate(new Date()),
  photos: [],
  verificationQuestion: '',
  verificationAnswer: '',
});

export default function PostItemScreen({ navigation }: TabScreenProps<'Post'>) {
  const { user } = useAuth();
  // Changing the key remounts the form, which clears it after a successful post.
  const [formKey, setFormKey] = useState(0);

  const submit = async (form: Form) => {
    if (!user) return;
    try {
      const { item, matches } = await createItem(user.id, form);
      haptics.success();
      setFormKey((k) => k + 1);
      navigation.navigate('ItemDetails', { itemId: item.id, matchCount: matches.length });
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Could not post your item. Please try again.'));
    }
  };

  return (
    <Screen scroll>
      <ItemForm key={formKey} initial={emptyForm()} submitLabel="Post item" submittingLabel="Posting…" onSubmit={submit} />
    </Screen>
  );
}
