import base64
import math
import sys
import json
import time
import os
import tempfile
import shutil

try:
    # Provided by 'pycryptodomex'
    from Cryptodome.Cipher import AES  # type: ignore
except ModuleNotFoundError:
    # Provided by 'pycryptodome'
    from Crypto.Cipher import AES  # type: ignore

cSharpHeader = [0, 1, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 0, 0]

key = b'UKu52ePUBwetZ9wNX88o54dnfKRu0T1l'
cipher = AES.new(key, AES.MODE_ECB)

def pad(text, block=16):
    text = text if type(text) == bytes else text.encode()
    amount = (block - len(text) % block)
    return text + bytes([amount]) * amount

def encrypt(plain):
    global cipher
    return cipher.encrypt(plain)

def decrypt(mud):
    global cipher
    return cipher.decrypt(mud)


def getLength(input):
    # lenBin = format(332184, 'b')
    lenBin = format(len(input), 'b')
    lenBinReverse = lenBin[::-1]
    dataLen = math.ceil(len(lenBinReverse) / 7.0)
    data = list(range(dataLen))
    for i in range(dataLen - 1):
        data[i] = lenBinReverse[i*7:(i+1)*7] + "1"
    data[-1] = lenBinReverse[(len(data)-1)*7:len(lenBinReverse)]
    output = list(range(dataLen))
    for i in range(len(output)):
        output[i] = int(data[i][::-1], 2) # doubleCast()
    return bytes(output)

def encode(jsonObj):
    content = json.dumps(jsonObj, separators=(',', ':'))
    content = pad(content, 16)
    encrypted_content = encrypt(content)
    encrypted_content = base64.encodebytes(encrypted_content)
    encrypted_content = encrypted_content.replace(bytes([13]), b'')
    encrypted_content = encrypted_content.replace(bytes([10]), b'')
    final_content = bytearray()
    final_content.extend(cSharpHeader)
    final_content.extend(getLength(encrypted_content))
    final_content.extend(encrypted_content)
    final_content.extend([11])
    return bytes(final_content)

def decode(encrypted):
    encrypted = base64.decodebytes(encrypted)
    plain = decrypt(encrypted)
    plain = plain[:-plain[-1]]
    return json.loads(plain)


def read_7bit_varint(data: bytes, offset: int):
    """Read a 7-bit varint like the one produced by getLength().

    Returns: (value, new_offset)
    """
    value = 0
    shift = 0
    while True:
        if offset >= len(data):
            raise ValueError('Unexpected EOF while reading length')
        b = data[offset]
        offset += 1
        value |= (b & 0x7F) << shift
        if (b & 0x80) == 0:
            break
        shift += 7
        if shift > 35:
            raise ValueError('Length varint too large')
    return value, offset


def extract_encoded_payload(content: bytes) -> bytes:
    """Extract the base64 payload from the on-disk encoded format.

    Format:
      [22-byte header][7-bit varint length][base64 bytes][0x0b]
    """
    if content[:22] != bytes(cSharpHeader):
        raise ValueError('Missing expected header')
    length, cursor = read_7bit_varint(content, 22)
    payload = content[cursor:cursor + length]
    if len(payload) != length:
        raise ValueError('Truncated payload')
    # Optional end marker
    end = content[cursor + length:cursor + length + 1]
    if end and end[0] != 11:
        # Some variants may omit/alter the terminator; don't hard-fail.
        pass
    return payload


def summarize_progress(obj):
    """Best-effort summary for unknown save JSON structure."""
    if not isinstance(obj, dict):
        print(green(f"Decoded root type: {type(obj).__name__}"))
        return

    print(green('Decoded JSON successfully.'))
    print('Top-level keys:', ', '.join(list(obj.keys())[:30]) + (' ...' if len(obj.keys()) > 30 else ''))

    # Heuristic fields commonly found in game saves
    candidates = [
        'completion', 'completionPercent', 'percent', 'percentage',
        'playTime', 'play_time', 'timePlayed', 'time_played',
        'currentScene', 'scene', 'area', 'map',
        'playerLevel', 'level',
        'geo', 'money',
        'deaths', 'kills',
        'bossesDefeated', 'bosses',
        'inventory', 'items',
        'upgrades',
        'chapter', 'act',
        'timestamp', 'lastSaved', 'last_save',
    ]

    found_any = False
    for k in candidates:
        if k in obj:
            v = obj.get(k)
            found_any = True
            if isinstance(v, (dict, list)):
                print(f"{k}: {type(v).__name__} ({len(v)})")
            else:
                print(f"{k}: {v}")

    if not found_any:
        print('No obvious progress keys found. You can inspect the decoded JSON to locate progress fields.')


def pick_file_from_directory(dir_path: str) -> str | None:
    """Pick a likely save file from a directory.

    In non-interactive mode (argv), chooses the most recently modified candidate.
    In interactive mode, shows a small list and prompts.
    """
    candidates: list[str] = []
    patterns = [
        '*.dat', '*.sav', '*.save', '*.bin', '*.json', '*restore*', '*Save*', '*save*'
    ]

    try:
        for name in os.listdir(dir_path):
            full = os.path.join(dir_path, name)
            if os.path.isfile(full):
                candidates.append(full)
    except Exception:
        return None

    # Prefer common save extensions
    preferred = [p for p in candidates if os.path.splitext(p)[1].lower() in {'.dat', '.sav', '.save', '.bin'}]
    if preferred:
        candidates = preferred

    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    if not candidates:
        return None

    if len(sys.argv) > 1:
        return candidates[0]

    print(green(f"Directory provided. Found {len(candidates)} candidate file(s):"))
    for idx, p in enumerate(candidates[:15], start=1):
        try:
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(p)))
        except Exception:
            mtime = 'unknown'
        print(f"  [{idx}] {p} (modified {mtime})")

    while True:
        choice = input('Pick a file number to decode (or press Enter for [1]): ').strip()
        if choice == '':
            return candidates[0]
        if choice.isdigit():
            i = int(choice)
            if 1 <= i <= min(len(candidates), 15):
                return candidates[i - 1]
        print(red('Invalid choice'))


def try_read_bytes(path: str) -> bytes:
    """Read bytes, with a temp-copy fallback for locked/permission cases."""
    try:
        with open(path, 'rb') as f:
            return f.read()
    except PermissionError:
        # Often caused by trying to open a directory or a locked file.
        # For locked files, copying can sometimes succeed; if it doesn't, user must close the game.
        suffix = os.path.splitext(path)[1]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        tmp.close()
        try:
            shutil.copy2(path, tmp_path)
            with open(tmp_path, 'rb') as f:
                return f.read()
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def red(text):
    return '{}{}{}'.format(bcolors.FAIL, text, bcolors.ENDC)

def green(text):
    return '{}{}{}'.format(bcolors.OKGREEN, text, bcolors.ENDC)

def clear():
    os.system('cls' if os.name=='nt' else 'clear')


def main():
    # Clearing the terminal can swallow output in some environments.
    # Only clear for interactive runs.
    if len(sys.argv) <= 1:
        clear()
    while True:
        content = b''
        if len(sys.argv) > 1:
            filepath = os.path.abspath(sys.argv[1])
        else:
            # check if valid filepath
            while True:
                user_input = input('Provide filename: ').strip()
                filepath = os.path.abspath(user_input)
                print(filepath)
                if os.path.isfile(filepath):
                    break
                else:
                    print(red('Invalid filepath'))

        if os.path.isdir(filepath):
            picked = pick_file_from_directory(filepath)
            if not picked:
                print(red('No files found in the provided directory.'))
                if len(sys.argv) > 1:
                    return
                continue
            filepath = picked
            print(green(f"Using file: {filepath}"))


        # check if valid file 
        try:
            content = try_read_bytes(filepath)
        except PermissionError:
            print(red('Permission denied reading file. If the game is open, close it and try again.'))
            if len(sys.argv) > 1:
                return
            continue

        isEncoded = content[:22] == bytes(cSharpHeader)
        isDecoded = False
        decoded_obj = None
        if not isEncoded:
            try:
                decoded_obj = json.loads(content)
                isDecoded = True
            except:
                try:
                    decoded_obj = json.loads(content.decode('utf-8'))
                    isDecoded = True
                except:
                    pass

        if not isDecoded and not isEncoded:
            print(red("Could not process file (neither JSON nor expected encoded format)\n"))
            if len(sys.argv) > 1:
                return
            continue

        time.sleep(0.1)
        print(green("Encoded file found. Decoding file..." if isEncoded else "Decoded file found. Encoding file..."))

        time.sleep(2)
        if (isEncoded):
            try:
                payload = extract_encoded_payload(content)
                jsonObject = decode(payload)
                summarize_progress(jsonObject)
                jsonString = json.dumps(jsonObject, indent=2)
                out_path = filepath + '.json'
                with open(out_path, 'w', encoding='utf-8') as f:
                    f.write(jsonString)
                print(green(f"Decoded JSON written to: {out_path}\n"))
            except:
                print(red("Could not decode\n"))
        else:
            try:
                jsonObject = decoded_obj if decoded_obj is not None else json.loads(content.decode())
                final = encode(jsonObject)
                with open(filepath, 'wb') as f:
                    f.write(bytes(final))
                    f.close()
                print(green("File Encoded\n"))
            except:
                print(red("Could not encode\n"))

        if len(sys.argv) > 1:
            return
        


main()
