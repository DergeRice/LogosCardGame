package com.baragames.logos.nativebridge;

import android.app.Activity;
import android.content.MutableContextWrapper;
import android.util.Log;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.CredentialManagerCallback;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.unity3d.player.UnityPlayer;
import org.json.JSONObject;

/** Launches the Android Google account picker for a server-issued challenge. */
public final class LogosGoogleSignIn {
    private static boolean pending;

    public static void signIn(String id, String clientId, String nonce, String receiver) {
        Activity activity = UnityPlayer.currentActivity;
        activity.runOnUiThread(() -> {
            if (pending) { finish(id, receiver, null, "다른 Google 로그인이 진행 중이에요."); return; }
            pending = true;
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(clientId)
                    .setNonce(nonce).build();
                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(option).build();
                CredentialManager.create(activity).getCredentialAsync(
                    new MutableContextWrapper(activity), request, null, activity.getMainExecutor(),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            pending = false;
                            try {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential) ||
                                    !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType()))
                                    throw new IllegalStateException("Unexpected credential type");
                                String token = GoogleIdTokenCredential.createFrom(
                                    ((CustomCredential) credential).getData()).getIdToken();
                                finish(id, receiver, token, null);
                            } catch (Exception error) {
                                Log.e("LogosGoogleSignIn", "Google credential parse failed", error);
                                finish(id, receiver, null, "Google 인증 결과를 읽지 못했어요.");
                            }
                        }
                        @Override public void onError(GetCredentialException error) {
                            pending = false;
                            Log.e("LogosGoogleSignIn", "Google credential request failed", error);
                            finish(id, receiver, null, "Google 로그인에 실패했거나 취소됐어요.");
                        }
                    });
            } catch (Exception error) {
                pending = false;
                Log.e("LogosGoogleSignIn", "Google credential request could not start", error);
                finish(id, receiver, null, "Google 로그인 화면을 열지 못했어요.");
            }
        });
    }

    private static void finish(String id, String receiver, String token, String error) {
        JSONObject result = new JSONObject();
        try {
            result.put("id", id);
            result.put("type", "logos-native-result");
            result.put("success", token != null);
            if (token != null) result.put("credential", token);
            if (error != null) result.put("error", error);
        } catch (Exception ignored) { return; }
        UnityPlayer.UnitySendMessage(receiver, "OnGoogleSignInResult", result.toString());
    }
}
