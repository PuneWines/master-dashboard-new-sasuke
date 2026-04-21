import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchUserDetailsApi, patchSystemAccessApi } from '../api/settingApi';


export const userDetails = createAsyncThunk(
    'fetch/user',
    async () => {
        const user = await fetchUserDetailsApi();
        return user;
    }
);

export const patchSystemAccess = createAsyncThunk(
    "settings/patchSystemAccess",
    async ({ id, system_access }) => {
        return await patchSystemAccessApi({ id, system_access });
    }
);


const settingsSlice = createSlice({
    name: 'settings',
    initialState: {
        userData: [],
        error: null,
        loading: false,
        isLoggedIn: false,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(userDetails.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(userDetails.fulfilled, (state, action) => {
                state.loading = false;
                state.userData = action.payload;

            })
            .addCase(userDetails.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(patchSystemAccess.pending, (state) => {
                state.loading = true;
            })
            .addCase(patchSystemAccess.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.userData.findIndex(
                    (user) => user.id === action.payload.id
                );

                if (index !== -1) {
                    state.userData[index] = action.payload;
                }
            })
            .addCase(patchSystemAccess.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });

    },
});

export default settingsSlice.reducer;
