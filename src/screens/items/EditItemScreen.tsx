/**
 * EditItemScreen: change your own post. Reuses ItemForm. Removed photos
 * are deleted from storage; new ones are compressed and uploaded.
 */
import Screen from '../../components/Screen';
import ItemForm from '../../components/ItemForm';
import { EmptyState, ErrorBanner, LoadingView } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchItem, getVerificationAnswer, updateItem } from '../../services/items';
import { getErrorMessage } from '../../utils/errors';
import { haptics } from '../../utils/haptics';
import type { AppScreenProps } from '../../navigation/types';
import type { ItemForm as Form } from '../../utils/validators';

export default function EditItemScreen({ navigation, route }: AppScreenProps<'EditItem'>) {
  const { itemId } = route.params;
  const { user } = useAuth();

  // Load the item AND its private answer (owner only) together.
  const query = useAsyncData(
    async () => {
      const item = await fetchItem(itemId);
      const answer = item?.verification_question ? await getVerificationAnswer(itemId) : null;
      return item ? { item, answer } : null;
    },
    [itemId],
    { refreshOnFocus: false }, // don't wipe the user's edits when they come back from the photo picker
  );

  if (query.loading) return <LoadingView />;
  if (query.error != null) {
    return (
      <Screen scroll>
        <ErrorBanner message={getErrorMessage(query.error)} onRetry={query.refresh} />
      </Screen>
    );
  }
  if (!query.data || query.data.item.user_id !== user?.id) {
    return <EmptyState icon="lock-closed-outline" title="You can only edit your own posts" actionLabel="Go back" onAction={() => navigation.goBack()} />;
  }

  const { item, answer } = query.data;
  const initial: Form = {
    type: item.type,
    title: item.title,
    description: item.description,
    category: item.category,
    location: item.location,
    date: item.date,
    photos: item.photo_urls,
    verificationQuestion: item.verification_question ?? '',
    verificationAnswer: answer ?? '',
  };

  return (
    <Screen scroll>
      <ItemForm
        initial={initial}
        typeLocked
        submitLabel="Save changes"
        submittingLabel="Saving…"
        onSubmit={async (form) => {
          try {
            await updateItem(item, form);
          } catch (err) {
            throw new Error(getErrorMessage(err, 'Could not save your changes.'));
          }
          haptics.success();
          navigation.goBack();
        }}
      />
    </Screen>
  );
}
