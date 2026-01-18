// WARNING: Do not modify! Generated file.

namespace UnityEngine.Purchasing.Security {
    public class GooglePlayTangle
    {
        private static byte[] data = System.Convert.FromBase64String("RTSEryoVYA4VQKCWgao176AG5qwwbAUAbKywnSYGLQC0BO2iNqMwDI1EBHSHCJUA");
        private static int[] order = new int[] { 1,1,2 };
        private static int key = 219;

        public static readonly bool IsPopulated = true;

        public static byte[] Data() {
        	if (IsPopulated == false)
        		return null;
            return Obfuscator.DeObfuscate(data, order, key);
        }
    }
}
