import { ref, type Ref } from "vue";
import { launcher, VersionState } from "./launcher";

export abstract class GameClass {
    public meta: Ref<GameMeta | undefined> = ref(undefined);
    public versionState: Ref<VersionState> = ref(VersionState.Unknown);

    get installed() {
        return this.meta.value?.installed ?? false;
    }

    abstract get gameIndex(): number;

    async updateMeta() {
        this.meta.value = await window.laochan.detectGameInstall(this.gameIndex);
        this.versionState.value = this.checkVersion();
    }

    get installPath() {
        if (!this.installed) {
            return;
        }
        return this.meta.value!.install_path;
    }

    get configPath() {
        const installPath = this.installPath;
        if (!installPath) {
            return;
        }

        return installPath + 'laochan-config.json';
    }

    checkVersion(): VersionState {
        if (!this.installed) {
            return VersionState.Unknown;
        }

        const targetVersion = this.meta.value!.game_module_target_version;

        if (targetVersion == 'ANY')
            return VersionState.Normal;

        const installVersion = this.meta.value!.game_module_version;
        const installVersionNum = Number.parseInt(installVersion.split(":")[4]);
        const targetVersionNum = Number.parseInt(targetVersion.split(":")[4]);

        if (installVersionNum > targetVersionNum) {
            return VersionState.Need2UpdateLauncher;
        }

        if (installVersionNum < targetVersionNum) {
            return VersionState.Need2UpdateGame;
        }

        return VersionState.Normal
    }

    async settings() {
        if (!this.installed) {
            return;
        }

        window.laochan.shellExecute(this.meta.value!.settings_module_path);
    }

    async updater() {
        if (!this.installed) {
            return;
        }

        window.laochan.shellExecute(this.meta.value!.updater_module_path, '-t dummy');
    }

    abstract loadConfig(): Promise<void>;
    abstract applyConfig(): Promise<void>;

    async start() {
        await this.loadConfig();
        await window.laochan.setGame(this.gameIndex);

        await this.applyConfig();
        await launcher.applyConfig();

        window.laochan.close();
    }
}
