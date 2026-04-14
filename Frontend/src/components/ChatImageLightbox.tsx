import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
};

/** Full-screen tap-to-close viewer for chat images. */
export function ChatImageLightbox({ uri, visible, onClose }: Props) {
  if (!uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.root} onPress={onClose} accessibilityLabel="Close photo">
        <View style={styles.inner} pointerEvents="box-none">
          <Image source={{ uri }} style={styles.image} resizeMode="contain" accessibilityLabel="Full size photo" />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  inner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
});
