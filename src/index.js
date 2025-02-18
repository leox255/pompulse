#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Conf from 'conf';
import figlet from 'figlet';
import singleLineLog from 'single-line-log';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import player from 'play-sound';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const log = singleLineLog.stdout;
const audio = player({});
const __dirname = dirname(fileURLToPath(import.meta.url));

// Constants
const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds
const POMODOROS_BEFORE_LONG_BREAK = 4;

// Sound files - using system sounds for better compatibility
const POMO_END_SOUND = process.platform === 'darwin' ? '/System/Library/Sounds/Glass.aiff' : join(__dirname, 'sounds', 'bell.mp3');
const BREAK_END_SOUND = process.platform === 'darwin' ? '/System/Library/Sounds/Ping.aiff' : join(__dirname, 'sounds', 'chime.mp3');

// Configuration store
const config = new Conf({
    projectName: 'pompulse',
    defaults: {
        totalPomodoros: 0,
        currentStreak: 0,
        soundEnabled: null, // null means not yet configured
        permissionRequested: false
    }
});

class PomPulse {
    constructor() {
        this.currentPomodoro = 0;
        this.totalPomodoros = config.get('totalPomodoros');
        this.soundEnabled = config.get('soundEnabled');
        this.permissionRequested = config.get('permissionRequested');
    }

    async requestNotificationPermission() {
        if (this.permissionRequested) return;

        if (process.platform === 'darwin') {
            console.log(chalk.yellow('\n🔔 PomPulse works best with sound notifications!'));
            console.log(chalk.cyan('Would you like to enable sound notifications? (y/n)'));
            
            process.stdin.setRawMode(true);
            return new Promise(resolve => {
                process.stdin.once('data', async data => {
                    process.stdin.setRawMode(false);
                    const answer = data.toString().toLowerCase();
                    
                    if (answer === 'y\n' || answer === 'y') {
                        try {
                            // Request macOS notification permission
                            await execAsync('osascript -e \'tell application "System Events" to display notification "PomPulse is ready to help you stay productive!" with title "PomPulse"\'');
                            this.soundEnabled = true;
                            console.log(chalk.green('\n✅ Sound notifications enabled!'));
                        } catch (error) {
                            console.log(chalk.yellow('\n⚠️  Please allow notifications in System Preferences to get the best experience.'));
                            this.soundEnabled = false;
                        }
                    } else {
                        this.soundEnabled = false;
                        console.log(chalk.yellow('\n🔕 Sound notifications disabled. You can enable them later with ') + chalk.cyan('pp sound'));
                    }
                    
                    config.set('soundEnabled', this.soundEnabled);
                    config.set('permissionRequested', true);
                    resolve();
                });
            });
        } else {
            // For non-macOS systems, just enable sounds by default
            this.soundEnabled = true;
            config.set('soundEnabled', true);
            config.set('permissionRequested', true);
        }
    }

    async playSound(soundFile) {
        if (!this.soundEnabled) return;
        
        try {
            if (process.platform === 'darwin') {
                // Use afplay for macOS (better system integration)
                await execAsync(`afplay "${soundFile}"`);
            } else {
                // Use play-sound for other platforms
                await new Promise((resolve, reject) => {
                    audio.play(soundFile, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } catch (error) {
            console.error(chalk.red('Error playing sound. You can disable sounds with ') + chalk.cyan('pp sound'));
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    createProgressBar(percentage) {
        const width = 50;
        const filled = Math.floor(width * (percentage / 100));
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    async displayTimer(duration, phase) {
        console.clear();
        console.log(chalk.yellow(figlet.textSync('PomPulse', { horizontalLayout: 'full' })));
        
        const startTime = Date.now();
        const endTime = startTime + (duration * 1000);

        while (Date.now() < endTime) {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            const percentage = ((duration - remaining) / duration) * 100;
            const progressBar = this.createProgressBar(percentage);

            const color = phase === 'POMODORO' ? 'green' : phase === 'SHORT BREAK' ? 'blue' : 'magenta';
            
            const display = `
${chalk[color].bold(phase)}

Time Remaining: ${chalk.white.bold(this.formatTime(remaining))}

${chalk[color](progressBar)}

Pomodoro ${this.currentPomodoro + 1}/4
Total Completed: ${this.totalPomodoros}
Sound: ${this.soundEnabled ? chalk.green('ON 🔔') : chalk.red('OFF 🔕')}
`;
            log(display);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('\n');
    }

    showSummary() {
        console.clear();
        console.log(chalk.yellow(figlet.textSync('Summary', { horizontalLayout: 'full' })));
        console.log('\n');
        console.log(chalk.cyan('Total Pomodoros Completed: ') + chalk.green(this.totalPomodoros));
        console.log(chalk.cyan('Current Streak: ') + chalk.green(`${this.currentPomodoro}/4`));
        console.log(chalk.cyan('Total Focus Time: ') + chalk.green(`${this.totalPomodoros * 25} minutes`));
        console.log(chalk.cyan('Sound Notifications: ') + (this.soundEnabled ? chalk.green('ON 🔔') : chalk.red('OFF 🔕')));
        console.log('\n');
    }

    async toggleSound() {
        if (!this.permissionRequested) {
            await this.requestNotificationPermission();
        } else {
            this.soundEnabled = !this.soundEnabled;
            config.set('soundEnabled', this.soundEnabled);
            console.log(chalk.yellow(`Sound notifications ${this.soundEnabled ? chalk.green('enabled 🔔') : chalk.red('disabled 🔕')}`));
            
            // Test sound when enabling
            if (this.soundEnabled) {
                console.log(chalk.cyan('Playing test notification...'));
                await this.playSound(POMO_END_SOUND);
            }
        }
    }

    async start() {
        try {
            // Request notification permission if not yet configured
            if (this.soundEnabled === null) {
                await this.requestNotificationPermission();
            }

            while (true) {
                // Pomodoro Session
                await this.displayTimer(POMODORO_DURATION, 'POMODORO');
                this.currentPomodoro++;
                this.totalPomodoros++;
                config.set('totalPomodoros', this.totalPomodoros);
                
                await this.playSound(POMO_END_SOUND);
                console.log(chalk.green.bold('🎉 Pomodoro completed! Time for a break!\n'));
                
                // Determine break type
                if (this.currentPomodoro >= POMODOROS_BEFORE_LONG_BREAK) {
                    console.log(chalk.magenta.bold('Starting long break...\n'));
                    await this.displayTimer(LONG_BREAK_DURATION, 'LONG BREAK');
                    this.currentPomodoro = 0;
                } else {
                    console.log(chalk.blue.bold('Starting short break...\n'));
                    await this.displayTimer(SHORT_BREAK_DURATION, 'SHORT BREAK');
                }
                
                await this.playSound(BREAK_END_SOUND);
                console.log(chalk.yellow.bold('Break completed! Starting next pomodoro...\n'));
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            if (error.message !== 'SIGINT') {
                console.error('An error occurred:', error);
            }
            this.showSummary();
            process.exit(0);
        }
    }
}

// CLI setup
const program = new Command();

program
    .name('pp')
    .description('PomPulse - A beautiful Pomodoro timer for your terminal')
    .version('1.0.0');

program
    .command('start')
    .description('Start the Pomodoro timer')
    .action(() => {
        const pomPulse = new PomPulse();
        pomPulse.start();
    });

program
    .command('summary')
    .description('Show productivity summary')
    .action(() => {
        const pomPulse = new PomPulse();
        pomPulse.showSummary();
    });

program
    .command('sound')
    .description('Toggle sound notifications')
    .action(() => {
        const pomPulse = new PomPulse();
        pomPulse.toggleSound();
    });

// Handle Ctrl+C
process.on('SIGINT', () => {
    throw new Error('SIGINT');
});

program.parse(); 