// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import "./interface/ICompliance.sol";
import "../token/IToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BasicCompliance is ICompliance, AccessControl {
    /// Mapping between agents and their statuses
    mapping(address => bool) private _tokenAgentsList;
    /// Mapping of tokens linked to the compliance contract
    IToken public tokenBound;

    // keccak256(ADMIN_ROLE)
    bytes32 public constant ADMIN_ROLE =
        0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775;

    // keccak256(TOKEN_ROLE)
    bytes32 public constant TOKEN_ROLE =
        0xa7197c38d9c4c7450c7f2cd20d0a17cbe7c344190d6c82a6b49a146e62439ae4;

    address public taxTokenAddress;

    constructor(address _taxTokenAddress) {
        _grantRole(0x00, _msgSender());
        _grantRole(ADMIN_ROLE, _msgSender());
        taxTokenAddress = _taxTokenAddress;
    }

    /**
     *  @dev See {ICompliance-bindToken}.
     */
    function bindToken(address _token) external {
        require(
            hasRole(ADMIN_ROLE, _msgSender()) ||
                address(tokenBound) == address(0),
            "ERC-3643: Caller not authorized"
        );
        tokenBound = IToken(_token);
        emit TokenBound(_token);
    }

    /**
     *  @dev See {ICompliance-unbindToken}.
     */
    function unbindToken(address _token) external {
        require(
            hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(TOKEN_ROLE, _msgSender()),
            "ERC-3643: Caller not authorized"
        );
        require(_token == address(tokenBound), "ERC-3643: Token not bound");
        delete tokenBound;
        emit TokenUnbound(_token);
    }

    /*
     *  @dev See {ICompliance-transferred}.
     */
    function transferred(address _from, address _to, uint256 _value) external {}

    /**
     *  @dev See {ICompliance-created}.
     */

    function created(address _to, uint256 _value) external {}

    /**
     *  @dev See {ICompliance-destroyed}.
     */
    function destroyed(address _from, uint256 _value) external {}

    /**
     *  @dev See {ICompliance-canTransfer}.
     */
    function canTransfer(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool) {
        return IERC20(taxTokenAddress).balanceOf(_to) > 0;
    }

    /**
     *  @dev See {ICompliance-isTokenBound}.
     */
    function isTokenBound(address _token) external view returns (bool) {
        return (_token == address(tokenBound));
    }
}
