// WARNING: Do not modify! Generated file.

namespace UnityEngine.Purchasing.Security {
    public class GooglePlayTangle
    {
        private static byte[] data = System.Convert.FromBase64String("eq5wlICeawrBAxJFlKzIF5ZPMSOuwsBYj6DTlGiGDu9BFM9qDP4/53XHRGd1SENMb8MNw7JIREREQEVGL9z798w4d784Qn8zAbItIwYjlpLHREpFdcdET0fHRERF/Xl5qswQSPA5Rzu4JvXCNi4gPJfYPqmHAhY6uLQ/w75UH6b9xucBO3J7TaBqURMnnh/FHeiDaqwG9FNsH8ZlGyT9wfDwYX4OX42oIeJdiFDo2ZnyLnN+UEU0weG0Vjb2GMFjPAtii/XN63I2qEtZZDczlhy3HkVi0G79vdwPGpmyOLAvQ8MzKrQYwjJop1aKBBK2owjclsN06k2cMqbb1AygAGpnVJ0hS6Hfqda8qbsEBT6kebg25ZGMQhTaBKL/QgpZhkdGREVE");
        private static int[] order = new int[] { 4,2,4,8,4,7,10,13,8,11,10,12,12,13,14 };
        private static int key = 69;

        public static readonly bool IsPopulated = true;

        public static byte[] Data() {
        	if (IsPopulated == false)
        		return null;
            return Obfuscator.DeObfuscate(data, order, key);
        }
    }
}
